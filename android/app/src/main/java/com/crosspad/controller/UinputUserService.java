package com.crosspad.controller;

import android.os.Process;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Shizuku UserService. Runs as UID shell (not this app's UID).
 *
 * Experimental virtual gamepad over the Android platform's "uinput -" shell
 * command. This intentionally does not invoke su or write root-owned files.
 * A device-specific SELinux policy may prohibit /dev/uinput access.
 */
public class UinputUserService extends IControllerUinputService.Stub {
    private static final int DEVICE_ID = 731;
    private static final String[] BUTTON_NAMES = {
        "actionDown", "actionRight", "actionUp", "actionLeft",
        "l1", "r1", "l2", "r2", "select", "start",
        "l3", "r3", "home"
    };
    private static final String[] UINPUT_BUTTONS = {
        "BTN_SOUTH", "BTN_EAST", "BTN_NORTH", "BTN_WEST",
        "BTN_TL", "BTN_TR", "BTN_TL2", "BTN_TR2",
        "BTN_SELECT", "BTN_START", "BTN_THUMBL", "BTN_THUMBR", "BTN_MODE"
    };
    private final Map<String, Integer> lastValues = new LinkedHashMap<>();
    private java.lang.Process uinput;
    private BufferedWriter stream;

    public UinputUserService() {}

    @Override
    public synchronized String probe() {
        File file = new File("/dev/uinput");
        return "uid=" + Process.myUid()
            + "; /dev/uinput=" + (file.exists() ? "present" : "missing")
            + "; writable=" + file.canWrite();
    }

    private static JSONObject absInfo(String code, int min, int max) throws Exception {
        JSONObject info = new JSONObject();
        info.put("value", 0);
        info.put("minimum", min);
        info.put("maximum", max);
        info.put("fuzz", 0);
        info.put("flat", 0);
        info.put("resolution", 0);
        JSONObject axis = new JSONObject();
        axis.put("code", code);
        axis.put("info", info);
        return axis;
    }

    private static JSONObject config(String type, String[] data) throws Exception {
        JSONObject entry = new JSONObject();
        entry.put("type", type);
        JSONArray values = new JSONArray();
        for (String value : data) values.put(value);
        entry.put("data", values);
        return entry;
    }

    private String registration() throws Exception {
        JSONObject command = new JSONObject();
        command.put("id", DEVICE_ID);
        command.put("command", "register");
        command.put("name", "Sony Interactive Entertainment Wireless Controller (CrossPad)");
        command.put("vid", 0x054C);
        command.put("pid", 0x09CC);
        command.put("bus", "bluetooth");
        JSONArray configuration = new JSONArray();
        configuration.put(config("UI_SET_EVBIT", new String[]{"EV_KEY", "EV_ABS"}));
        configuration.put(config("UI_SET_KEYBIT", UINPUT_BUTTONS));
        configuration.put(config("UI_SET_ABSBIT", new String[]{
            "ABS_X", "ABS_Y", "ABS_RX", "ABS_RY", "ABS_Z", "ABS_RZ", "ABS_HAT0X", "ABS_HAT0Y"
        }));
        command.put("configuration", configuration);
        JSONArray axes = new JSONArray();
        for (String axis : new String[]{"ABS_X", "ABS_Y", "ABS_RX", "ABS_RY"}) {
            axes.put(absInfo(axis, -32768, 32767));
        }
        for (String axis : new String[]{"ABS_Z", "ABS_RZ"}) axes.put(absInfo(axis, 0, 255));
        axes.put(absInfo("ABS_HAT0X", -1, 1));
        axes.put(absInfo("ABS_HAT0Y", -1, 1));
        command.put("abs_info", axes);
        return command.toString();
    }

    @Override
    public synchronized boolean start() {
        stop();
        try {
            if (!new File("/dev/uinput").canWrite()) return false;
            uinput = new ProcessBuilder("uinput", "-").start();
            stream = new BufferedWriter(new OutputStreamWriter(uinput.getOutputStream(), StandardCharsets.UTF_8));
            stream.write(registration());
            stream.newLine();
            stream.flush();
            // Allow Android InputReader to register the new device.
            Thread.sleep(700);
            if (!uinput.isAlive()) {
                stop();
                return false;
            }
            lastValues.clear();
            return true;
        } catch (Exception error) {
            stop();
            return false;
        }
    }

    private void appendChanged(JSONArray events, String kind, String axis, int value) throws Exception {
        Integer previous = lastValues.put(axis, value);
        if (previous != null && previous == value) return;
        events.put(kind);
        events.put(axis);
        events.put(value);
    }

    private static int scaled(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return 0;
        return (int) Math.round(Math.min(1.0, Math.max(-1.0, value)) * 32767);
    }

    @Override
    public synchronized void submit(String stateJson) {
        if (stream == null || uinput == null || !uinput.isAlive()) return;
        try {
            JSONObject state = new JSONObject(stateJson);
            JSONObject buttons = state.optJSONObject("buttons");
            JSONObject left = state.optJSONObject("leftStick");
            JSONObject right = state.optJSONObject("rightStick");
            if (buttons == null || left == null || right == null) return;
            JSONArray events = new JSONArray();
            for (int i = 0; i < BUTTON_NAMES.length; i++) {
                appendChanged(events, "EV_KEY", UINPUT_BUTTONS[i],
                    buttons.optBoolean(BUTTON_NAMES[i]) ? 1 : 0);
            }
            int dx = (buttons.optBoolean("dpadRight") ? 1 : 0) - (buttons.optBoolean("dpadLeft") ? 1 : 0);
            int dy = (buttons.optBoolean("dpadDown") ? 1 : 0) - (buttons.optBoolean("dpadUp") ? 1 : 0);
            appendChanged(events, "EV_ABS", "ABS_HAT0X", dx);
            appendChanged(events, "EV_ABS", "ABS_HAT0Y", dy);
            appendChanged(events, "EV_ABS", "ABS_X", scaled(left.optDouble("x", 0)));
            appendChanged(events, "EV_ABS", "ABS_Y", scaled(-left.optDouble("y", 0)));
            appendChanged(events, "EV_ABS", "ABS_RX", scaled(right.optDouble("x", 0)));
            appendChanged(events, "EV_ABS", "ABS_RY", scaled(-right.optDouble("y", 0)));
            appendChanged(events, "EV_ABS", "ABS_Z", (int) Math.round(255 * Math.max(0, Math.min(1, buttons.optDouble("l2Value", 0)))));
            appendChanged(events, "EV_ABS", "ABS_RZ", (int) Math.round(255 * Math.max(0, Math.min(1, buttons.optDouble("r2Value", 0)))));
            if (events.length() == 0) return;
            events.put("EV_SYN");
            events.put("SYN_REPORT");
            events.put(0);
            JSONObject timestamp = new JSONObject();
            timestamp.put("id", DEVICE_ID);
            timestamp.put("command", "updateTimeBase");
            JSONObject inject = new JSONObject();
            inject.put("id", DEVICE_ID);
            inject.put("command", "inject");
            inject.put("events", events);
            stream.write(timestamp.toString());
            stream.newLine();
            stream.write(inject.toString());
            stream.newLine();
            stream.flush();
        } catch (Exception error) {
            // If the tool exits, the next check will show no virtual device.
            stop();
        }
    }

    @Override
    public synchronized void stop() {
        lastValues.clear();
        if (stream != null) {
            try { stream.close(); } catch (IOException ignored) {}
            stream = null;
        }
        if (uinput != null) {
            uinput.destroy();
            uinput = null;
        }
    }

    @Override
    public void destroy() {
        stop();
        System.exit(0);
    }
}

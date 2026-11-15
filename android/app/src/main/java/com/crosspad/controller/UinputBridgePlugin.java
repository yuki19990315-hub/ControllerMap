package com.crosspad.controller;

import android.content.ComponentName;
import android.content.ServiceConnection;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.IBinder;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import rikka.shizuku.Shizuku;

/**
 * Experimental rootless DS4-compatible gamepad bridge.
 * Uses Shizuku (UID shell) with the Android uinput command.
 *
 * On some Android builds /dev/uinput is denied by SELinux. No root fallback.
 * Registration does not guarantee that any given game recognizes full DS4 HID.
 */
@CapacitorPlugin(name = "GamepadUinput", permissions = {
    @Permission(alias = "joyConNearby", strings = { Manifest.permission.BLUETOOTH_CONNECT })
})
public class UinputBridgePlugin extends Plugin {
    private static final int SHIZUKU_PERMISSION_REQUEST = 7312;
    private final ExecutorService writerExecutor = Executors.newSingleThreadExecutor();
    private volatile IControllerUinputService remote;
    private volatile boolean active = false;
    private volatile boolean joyConActive = false;
    private PluginCall pendingStart;
    private PluginCall pendingPermission;
    private PluginCall pendingJoyCon;
    private String pendingJoyAction;

    private final Shizuku.OnRequestPermissionResultListener permissionListener = (requestCode, grantResult) -> {
        if (requestCode != SHIZUKU_PERMISSION_REQUEST) return;
        PluginCall pending = pendingPermission;
        pendingPermission = null;
        if (pending == null) return;
        if (grantResult == PackageManager.PERMISSION_GRANTED) pending.resolve();
        else pending.reject("Shizukuのアクセス権限が拒否されました");
    };

    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            remote = IControllerUinputService.Stub.asInterface(binder);
            PluginCall call = pendingStart;
            pendingStart = null;
            if (call != null) {
                writerExecutor.execute(() -> {
                    try {
                        IControllerUinputService service = remote;
                        if (service == null) throw new IllegalStateException("サービスが切断されました");
                        String probe = service.probe();
                        boolean ok = service.start();
                        active = ok;
                        joyConActive = false;
                        getContext().stopService(new Intent(getContext(), JoyConKeepAliveService.class));
                        JSObject result = new JSObject();
                        result.put("active", ok);
                        result.put("probe", probe);
                        if (ok) call.resolve(result);
                        else call.reject("仮想ゲームパッドを作成できませんでした: " + probe);
                    } catch (Exception error) {
                        active = false;
                        call.reject("uinputの開始エラー: " + error.getMessage());
                    }
                });
            }
            PluginCall joyCall = pendingJoyCon;
            String joyAction = pendingJoyAction;
            pendingJoyCon = null;
            pendingJoyAction = null;
            if (joyCall != null) runJoyConAction(joyCall, joyAction);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            remote = null;
            active = false;
            joyConActive = false;
            getContext().stopService(new Intent(getContext(), JoyConKeepAliveService.class));
            PluginCall call = pendingStart;
            pendingStart = null;
            if (call != null) call.reject("Shizuku UserServiceの接続が切れました");
            PluginCall joyCall = pendingJoyCon;
            pendingJoyCon = null;
            pendingJoyAction = null;
            if (joyCall != null) joyCall.reject("Shizuku UserServiceの接続が切れました");
        }
    };

    @Override
    public void load() {
        super.load();
        Shizuku.addRequestPermissionResultListener(permissionListener);
    }

    private boolean available() {
        try {
            return Shizuku.pingBinder() && !Shizuku.isPreV11();
        } catch (Exception error) {
            return false;
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        boolean running = available();
        boolean granted = false;
        int uid = -1;
        if (running) {
            try {
                granted = Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED;
                uid = Shizuku.getUid();
            } catch (Exception ignored) { }
        }
        JSObject result = new JSObject();
        result.put("shizukuRunning", running);
        result.put("authorized", granted);
        result.put("uid", uid);
        result.put("virtualPadActive", active);
        result.put("joyConActive", joyConActive);
        result.put("mode", "experimental-uinput");
        call.resolve(result);
    }

    @PluginMethod
    public void authorize(PluginCall call) {
        if (!available()) {
            call.reject("Shizukuが起動していません。Shizukuアプリでサービスを開始してください。");
            return;
        }
        try {
            if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                call.resolve();
            } else if (Shizuku.shouldShowRequestPermissionRationale()) {
                call.reject("Shizukuの権限が拒否されています。Shizukuアプリの設定を確認してください。");
            } else {
                if (pendingPermission != null) {
                    call.reject("権限の確認が進行中です");
                    return;
                }
                pendingPermission = call;
                Shizuku.requestPermission(SHIZUKU_PERMISSION_REQUEST);
            }
        } catch (Exception error) {
            pendingPermission = null;
            call.reject("Shizuku権限エラー: " + error.getMessage());
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!available()) {
            call.reject("Shizukuが起動していません");
            return;
        }
        try {
            if (Shizuku.checkSelfPermission() != PackageManager.PERMISSION_GRANTED) {
                call.reject("先にShizukuへのアクセスを許可してください");
                return;
            }
            if (pendingStart != null || pendingJoyCon != null) {
                call.reject("仮想コントローラーを準備中です");
                return;
            }
            if (remote != null) {
                writerExecutor.execute(() -> {
                    try {
                        String probe = remote.probe();
                        boolean ok = remote.start();
                        active = ok;
                        joyConActive = false;
                        getContext().stopService(new Intent(getContext(), JoyConKeepAliveService.class));
                        JSObject result = new JSObject();
                        result.put("active", ok);
                        result.put("probe", probe);
                        if (ok) call.resolve(result);
                        else call.reject("仮想DS4の作成に失敗: " + probe);
                    } catch (Exception e) {
                        call.reject("仮想DS4の作成に失敗: " + e.getMessage());
                    }
                });
                return;
            }

            pendingStart = call;
            Shizuku.UserServiceArgs args = new Shizuku.UserServiceArgs(
                new ComponentName(getContext(), UinputUserService.class))
                .daemon(false)
                .processNameSuffix("crosspad-uinput")
                .tag("crosspad-uinput-v2")
                .version(2);
            Shizuku.bindUserService(args, connection);
        } catch (Exception error) {
            pendingStart = null;
            call.reject("Shizuku接続に失敗: " + error.getMessage());
        }
    }

    private String nativeLibraryPath() {
        return new java.io.File(getContext().getApplicationInfo().nativeLibraryDir,
            "libjoyconmerge.so").getAbsolutePath();
    }

    /** Run the full bridge inside Shizuku, never in a WebView or activity callback. */
    private void runJoyConAction(PluginCall call, String action) {
        writerExecutor.execute(() -> {
            try {
                IControllerUinputService service = remote;
                if (service == null) throw new IllegalStateException("Shizukuが切断されました");
                String raw;
                if ("start".equals(action)) {
                    raw = service.joyConStart(nativeLibraryPath());
                    active = false;
                } else if ("probe".equals(action)) {
                    raw = service.joyConProbe(nativeLibraryPath());
                } else if ("stop".equals(action)) {
                    service.joyConStop();
                    raw = service.joyConStatus();
                } else {
                    raw = service.joyConStatus();
                }
                JSONObject parsed = new JSONObject(raw);
                joyConActive = parsed.optBoolean("active", false);
                if ("start".equals(action) && joyConActive) {
                    try {
                        ContextCompat.startForegroundService(getContext(),
                            new Intent(getContext(), JoyConKeepAliveService.class));
                    } catch (RuntimeException ignored) {
                        // A device may reject background launch; Shizuku may still work.
                    }
                }
                if (!joyConActive || "stop".equals(action)) {
                    getContext().stopService(new Intent(getContext(), JoyConKeepAliveService.class));
                }
                JSObject response = new JSObject();
                response.put("status", parsed);
                call.resolve(response);
            } catch (Exception error) {
                if (!"probe".equals(action) && !"status".equals(action)) joyConActive = false;
                call.reject("Joy-Conブリッジ: " + error.getMessage());
            }
        });
    }

    private void callJoyCon(PluginCall call, String action) {
        if ("start".equals(action) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState("joyConNearby") != PermissionState.GRANTED) {
            requestPermissionForAlias("joyConNearby", call, "joyConPermissionResult");
            return;
        }
        if ("stop".equals(action) && remote == null) {
            joyConActive = false;
            JSObject response = new JSObject();
            JSObject status = new JSObject();
            status.put("active", false);
            status.put("message", "停止中");
            response.put("status", status);
            call.resolve(response);
            return;
        }
        if (!available()) {
            call.reject("Shizukuが起動していません");
            return;
        }
        try {
            if (Shizuku.checkSelfPermission() != PackageManager.PERMISSION_GRANTED) {
                call.reject("先にShizukuへのアクセスを許可してください");
                return;
            }
            if (remote != null) {
                runJoyConAction(call, action);
                return;
            }
            if (pendingJoyCon != null || pendingStart != null) {
                call.reject("Shizukuサービスへの接続処理中です");
                return;
            }
            pendingJoyCon = call;
            pendingJoyAction = action;
            Shizuku.UserServiceArgs args = new Shizuku.UserServiceArgs(
                new ComponentName(getContext(), UinputUserService.class))
                .daemon(false)
                .processNameSuffix("crosspad-uinput")
                .tag("crosspad-uinput-v2")
                .version(2);
            Shizuku.bindUserService(args, connection);
        } catch (Exception error) {
            pendingJoyCon = null;
            pendingJoyAction = null;
            call.reject("Shizuku接続に失敗: " + error.getMessage());
        }
    }

    @PermissionCallback
    private void joyConPermissionResult(PluginCall call) {
        if (getPermissionState("joyConNearby") != PermissionState.GRANTED) {
            call.reject("バックグラウンドでJoy-Conを維持するためBluetoothの権限が必要です");
        } else {
            callJoyCon(call, "start");
        }
    }

    @PluginMethod
    public void joyConProbe(PluginCall call) {
        callJoyCon(call, "probe");
    }

    @PluginMethod
    public void joyConStart(PluginCall call) {
        callJoyCon(call, "start");
    }

    @PluginMethod
    public void joyConStatus(PluginCall call) {
        callJoyCon(call, "status");
    }

    @PluginMethod
    public void joyConStop(PluginCall call) {
        callJoyCon(call, "stop");
    }

    @PluginMethod
    public void submit(PluginCall call) {
        String stateJson = call.getString("state");
        if (stateJson == null) {
            call.reject("入力データがありません");
            return;
        }
        if (active && remote != null) {
            writerExecutor.execute(() -> {
                try {
                    IControllerUinputService service = remote;
                    if (service != null) service.submit(stateJson);
                } catch (Exception error) {
                    active = false;
                }
            });
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        active = false;
        writerExecutor.execute(() -> {
            try {
                IControllerUinputService service = remote;
                if (service != null) service.stop();
                call.resolve();
            } catch (Exception error) {
                call.reject("仮想DS4を停止できませんでした: " + error.getMessage());
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        active = false;
        joyConActive = false;
        getContext().stopService(new Intent(getContext(), JoyConKeepAliveService.class));
        Shizuku.removeRequestPermissionResultListener(permissionListener);
        writerExecutor.execute(() -> {
            try {
                if (remote != null) {
                    remote.stop();
                    remote.joyConStop();
                }
            } catch (Exception ignored) { }
        });
        super.handleOnDestroy();
    }
}

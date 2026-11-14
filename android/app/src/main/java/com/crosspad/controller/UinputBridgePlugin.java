package com.crosspad.controller;

import android.content.ComponentName;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.IBinder;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
@CapacitorPlugin(name = "GamepadUinput")
public class UinputBridgePlugin extends Plugin {
    private static final int SHIZUKU_PERMISSION_REQUEST = 7312;
    private final ExecutorService writerExecutor = Executors.newSingleThreadExecutor();
    private volatile IControllerUinputService remote;
    private volatile boolean active = false;
    private PluginCall pendingStart;
    private PluginCall pendingPermission;

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
            if (call == null) return;
            writerExecutor.execute(() -> {
                try {
                    String probe = remote.probe();
                    boolean ok = remote.start();
                    active = ok;
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

        @Override
        public void onServiceDisconnected(ComponentName name) {
            remote = null;
            active = false;
            PluginCall call = pendingStart;
            pendingStart = null;
            if (call != null) call.reject("Shizuku UserServiceの接続が切れました");
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
            if (pendingStart != null) {
                call.reject("仮想コントローラーを準備中です");
                return;
            }
            if (remote != null) {
                writerExecutor.execute(() -> {
                    try {
                        String probe = remote.probe();
                        boolean ok = remote.start();
                        active = ok;
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
                .tag("crosspad-uinput-v1")
                .version(1);
            Shizuku.bindUserService(args, connection);
        } catch (Exception error) {
            pendingStart = null;
            call.reject("Shizuku接続に失敗: " + error.getMessage());
        }
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
        Shizuku.removeRequestPermissionResultListener(permissionListener);
        writerExecutor.execute(() -> {
            try {
                if (remote != null) remote.stop();
            } catch (Exception ignored) { }
        });
        super.handleOnDestroy();
    }
}

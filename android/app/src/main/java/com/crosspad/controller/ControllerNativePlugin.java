package com.crosspad.controller;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.InputDevice;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Native Android BLE input diagnostics for unmodified phones.
 * Does not inject input into other applications or impersonate a DUALSHOCK 4.
 * A discovered BLE device is not necessarily a ShootingPlus V3 controller;
 * packet format must be verified against the real hardware.
 */
@CapacitorPlugin(name = "ControllerNative", permissions = {
    @Permission(alias = "nearby", strings = {
        Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT
    }),
    @Permission(alias = "legacyLocation", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
})
public class ControllerNativePlugin extends Plugin {
    private static final UUID V3_SERVICE = UUID.fromString("0000ffe0-0000-1000-8000-00805f9b34fb");
    private static final UUID V3_CHARACTERISTIC = UUID.fromString("0000ffe1-0000-1000-8000-00805f9b34fb");
    private static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    private static final long SCAN_TIMEOUT_MS = 12000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Set<String> discoveredAddresses = new HashSet<>();
    private BluetoothLeScanner scanner;
    private boolean scanning;
    private BluetoothGatt activeGatt;
    private volatile boolean gattConnected;
    private String activeAddress;
    private String activeName;

    @PluginMethod
    public void capabilities(PluginCall call) {
        JSObject result = new JSObject();
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager != null ? manager.getAdapter() : null;
        boolean ble = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
        result.put("nativeBle", adapter != null && ble);
        result.put("bluetoothEnabled", adapter != null && adapter.isEnabled());
        result.put("canImpersonateDs4ForLocalGames", false);
        result.put("message", "Rootなしの通常APKでは他のゲームにDS4として入力を注入できません");
        call.resolve(result);
    }

    @PluginMethod
    public void systemGamepads(PluginCall call) {
        JSArray devices = new JSArray();
        for (int deviceId : InputDevice.getDeviceIds()) {
            InputDevice device = InputDevice.getDevice(deviceId);
            if (device == null) continue;
            int sources = device.getSources();
            if ((sources & InputDevice.SOURCE_GAMEPAD) != InputDevice.SOURCE_GAMEPAD &&
                (sources & InputDevice.SOURCE_JOYSTICK) != InputDevice.SOURCE_JOYSTICK) continue;
            JSObject info = new JSObject();
            info.put("id", deviceId);
            info.put("name", device.getName());
            info.put("vendorId", device.getVendorId());
            info.put("productId", device.getProductId());
            info.put("sources", sources);
            devices.put(info);
        }
        JSObject result = new JSObject();
        result.put("devices", devices);
        call.resolve(result);
    }

    private BluetoothAdapter getAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : null;
    }

    private boolean permissionsGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("nearby") == PermissionState.GRANTED;
        }
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPermissionsIfNeeded(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("nearby", call, "permissionResult");
        } else {
            requestPermissionForAlias("legacyLocation", call, "permissionResult");
        }
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        if (!permissionsGranted()) {
            call.reject("Bluetooth の「付近のデバイス」権限が必要です");
            return;
        }
        String action = call.getString("action", "scan");
        if ("connect".equals(action)) connectDevice(call);
        else scanDevices(call);
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (!permissionsGranted()) {
            // Preserve the requested operation for the permission callback.
            call.getData().put("action", "scan");
            requestPermissionsIfNeeded(call);
            return;
        }
        scanDevices(call);
    }

    private void scanDevices(PluginCall call) {
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth がオフ、または利用できません");
            return;
        }
        try {
            stopScanInternal();
            discoveredAddresses.clear();
            scanner = adapter.getBluetoothLeScanner();
            if (scanner == null) {
                call.reject("BLE スキャナーを取得できませんでした");
                return;
            }
            scanner.startScan(scanCallback);
            scanning = true;
            mainHandler.removeCallbacks(stopAfterTimeout);
            mainHandler.postDelayed(stopAfterTimeout, SCAN_TIMEOUT_MS);
            call.resolve();
            emitStatus("scanning", "", "");
        } catch (SecurityException | IllegalStateException exception) {
            call.reject("BLE スキャンに失敗: " + exception.getMessage());
        }
    }

    private final Runnable stopAfterTimeout = () -> {
        stopScanInternal();
        emitStatus("scan_complete", "", "");
    };

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            if (!scanning || result == null || result.getDevice() == null) return;
            try {
                String address = result.getDevice().getAddress();
                if (!discoveredAddresses.add(address)) return;
                String name = result.getScanRecord() != null ? result.getScanRecord().getDeviceName() : null;
                if (name == null || name.trim().isEmpty()) name = result.getDevice().getName();
                if (name == null || name.trim().isEmpty()) name = "名称不明のBLE機器";
                JSObject found = new JSObject();
                found.put("address", address);
                found.put("name", name);
                found.put("rssi", result.getRssi());
                notifyListeners("deviceFound", found);
            } catch (SecurityException ignored) {
                emitStatus("error", "", "Bluetooth の権限を確認してください");
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            scanning = false;
            emitStatus("error", "", "BLE スキャンエラー: " + errorCode);
        }
    };

    private void stopScanInternal() {
        mainHandler.removeCallbacks(stopAfterTimeout);
        if (!scanning) return;
        scanning = false;
        try {
            if (scanner != null) scanner.stopScan(scanCallback);
        } catch (SecurityException | IllegalStateException ignored) { }
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        stopScanInternal();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!permissionsGranted()) {
            call.getData().put("action", "connect");
            requestPermissionsIfNeeded(call);
            return;
        }
        connectDevice(call);
    }

    private void connectDevice(PluginCall call) {
        String address = call.getString("address");
        if (address == null || !BluetoothAdapter.checkBluetoothAddress(address)) {
            call.reject("接続先のBluetoothアドレスが不正です");
            return;
        }
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth が利用できません");
            return;
        }
        stopScanInternal();
        closeGatt();
        activeAddress = address;
        activeName = call.getString("name", "BLE コントローラー");
        try {
            BluetoothDevice device = adapter.getRemoteDevice(address);
            activeGatt = device.connectGatt(getContext(), false, gattCallback, BluetoothDevice.TRANSPORT_LE);
            if (activeGatt == null) {
                call.reject("GATT接続を開始できませんでした");
                return;
            }
            emitStatus("connecting", "", "");
            call.resolve();
        } catch (SecurityException | IllegalArgumentException exception) {
            call.reject("BLE 接続エラー: " + exception.getMessage());
        }
    }

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt gatt, int status, int state) {
            if (gatt != activeGatt) {
                gatt.close();
                return;
            }
            if (status == BluetoothGatt.GATT_SUCCESS && state == BluetoothProfile.STATE_CONNECTED) {
                gattConnected = true;
                emitStatus("connected", "", "");
                try {
                    if (!gatt.discoverServices()) emitStatus("error", "", "GATTサービス検索に失敗");
                } catch (SecurityException exception) {
                    emitStatus("error", "", exception.getMessage());
                }
            } else {
                gattConnected = false;
                emitStatus(status == BluetoothGatt.GATT_SUCCESS ? "disconnected" : "error",
                    "", "GATT status: " + status);
                closeGatt();
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt gatt, int status) {
            if (gatt != activeGatt || status != BluetoothGatt.GATT_SUCCESS) {
                emitStatus("error", "", "GATTサービスが取得できません");
                return;
            }
            BluetoothGattCharacteristic candidate = null;
            BluetoothGattService v3 = gatt.getService(V3_SERVICE);
            if (v3 != null) {
                BluetoothGattCharacteristic characteristic = v3.getCharacteristic(V3_CHARACTERISTIC);
                if (characteristic != null && isNotifiable(characteristic)) candidate = characteristic;
            }
            if (candidate == null) {
                for (BluetoothGattService service : gatt.getServices()) {
                    for (BluetoothGattCharacteristic characteristic : service.getCharacteristics()) {
                        if (isNotifiable(characteristic)) {
                            candidate = characteristic;
                            break;
                        }
                    }
                    if (candidate != null) break;
                }
            }
            if (candidate == null) {
                emitStatus("no_notifications", "", "通知対応のGATT特性が見つかりません");
                return;
            }
            try {
                boolean enabled = gatt.setCharacteristicNotification(candidate, true);
                if (!enabled) {
                    emitStatus("error", "", "GATT通知を有効にできません");
                    return;
                }
                BluetoothGattDescriptor descriptor = candidate.getDescriptor(CCCD);
                if (descriptor != null) {
                    byte[] value = (candidate.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0
                        ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                    if (Build.VERSION.SDK_INT >= 33) {
                        if (gatt.writeDescriptor(descriptor, value) != android.bluetooth.BluetoothStatusCodes.SUCCESS) {
                            emitStatus("error", "", "CCCD書き込みを開始できません");
                        }
                    } else {
                        descriptor.setValue(value);
                        if (!gatt.writeDescriptor(descriptor)) emitStatus("error", "", "CCCD書き込みに失敗");
                    }
                } else {
                    emitStatus("notifications_ready", candidate.getUuid().toString(), "");
                }
            } catch (SecurityException exception) {
                emitStatus("error", "", exception.getMessage());
            }
        }

        @Override
        public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
            if (gatt != activeGatt) return;
            emitStatus(status == BluetoothGatt.GATT_SUCCESS ? "notifications_ready" : "error",
                descriptor.getCharacteristic().getUuid().toString(),
                status == BluetoothGatt.GATT_SUCCESS ? "" : "CCCD書き込み失敗: " + status);
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, byte[] value) {
            if (gatt == activeGatt) emitPacket(characteristic, value);
        }

        @Override
        @SuppressWarnings("deprecation")
        public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
            if (Build.VERSION.SDK_INT < 33 && gatt == activeGatt) emitPacket(characteristic, characteristic.getValue());
        }
    };

    private boolean isNotifiable(BluetoothGattCharacteristic characteristic) {
        int properties = characteristic.getProperties();
        return (properties & (BluetoothGattCharacteristic.PROPERTY_NOTIFY | BluetoothGattCharacteristic.PROPERTY_INDICATE)) != 0;
    }

    private void emitPacket(BluetoothGattCharacteristic characteristic, byte[] bytes) {
        if (bytes == null) return;
        JSArray array = new JSArray();
        for (byte value : bytes) array.put(value & 0xFF);
        JSObject payload = new JSObject();
        payload.put("address", activeAddress);
        payload.put("characteristic", characteristic.getUuid().toString());
        payload.put("bytes", array);
        notifyListeners("packet", payload);
    }

    private void emitStatus(String status, String characteristic, String detail) {
        JSObject payload = new JSObject();
        payload.put("status", status);
        payload.put("address", activeAddress != null ? activeAddress : "");
        payload.put("name", activeName != null ? activeName : "");
        payload.put("characteristic", characteristic);
        payload.put("detail", detail);
        notifyListeners("status", payload);
    }

    private void closeGatt() {
        gattConnected = false;
        stopKeepAlive();
        BluetoothGatt old = activeGatt;
        activeGatt = null;
        if (old != null) {
            try { old.disconnect(); } catch (SecurityException ignored) { }
            old.close();
        }
    }

    private void stopKeepAlive() {
        try { getContext().stopService(new Intent(getContext(), ControllerLinkService.class)); }
        catch (RuntimeException ignored) { }
    }

    @PluginMethod
    public void connectionKeepAliveStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", ControllerLinkService.isRunning());
        result.put("gattConnected", gattConnected);
        result.put("hasActiveGatt", activeGatt != null);
        call.resolve(result);
    }

    @PluginMethod
    public void setConnectionKeepAlive(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (!enabled) {
            stopKeepAlive();
            JSObject result = new JSObject();
            result.put("active", false);
            call.resolve(result);
            return;
        }
        if (activeGatt == null || !gattConnected) {
            call.reject("先にBLE機器へ接続してください");
            return;
        }
        if (!permissionsGranted()) {
            call.reject("Bluetoothの付近のデバイス権限が必要です");
            return;
        }
        try {
            Intent intent = new Intent(getContext(), ControllerLinkService.class);
            ContextCompat.startForegroundService(getContext(), intent);
            JSObject result = new JSObject();
            result.put("active", true);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("接続保持サービスの開始に失敗: " + error.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        stopScanInternal();
        closeGatt();
        emitStatus("disconnected", "", "");
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopScanInternal();
        closeGatt();
        super.handleOnDestroy();
    }
}

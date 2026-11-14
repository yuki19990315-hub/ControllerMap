package com.crosspad.controller;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * A user-initiated connectedDevice foreground service. Keeps the app process
 * eligible to retain an already-open GATT connection while the UI is not
 * foreground. The service intentionally does not claim that WebView JavaScript
 * or Shizuku input forwarding continues when the activity is suspended.
 */
public class ControllerLinkService extends Service {
    public static final String ACTION_STOP = "com.crosspad.controller.STOP_KEEP_ALIVE";
    public static final String CHANNEL_ID = "crosspad_ble_link";
    private static final int NOTIFICATION_ID = 2741;
    private static volatile boolean running;

    public static boolean isRunning() { return running; }

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                "CrossPad Bluetooth接続", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("ControllerMapがBLE接続を保持している間の通知");
            manager.createNotificationChannel(channel);
        }
    }

    private Notification notification() {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent stopIntent = new Intent(this, ControllerLinkService.class).setAction(ACTION_STOP);
        PendingIntent stop = PendingIntent.getService(
            this, 1, stopIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("ControllerMap · BLE接続保持")
            .setContentText("接続を維持しています。ゲーム入力の継続は端末で要検証")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(content)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "接続保持を終了", stop)
            .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(),
                Build.VERSION.SDK_INT >= 29
                    ? ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE : 0);
            running = true;
        } catch (RuntimeException error) {
            running = false;
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}

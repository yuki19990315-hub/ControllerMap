package com.crosspad.controller;

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

/** Keeps the Shizuku binding's owning process alive while a game has focus. */
public class JoyConKeepAliveService extends Service {
    private static final String CHANNEL = "crosspad_joycon_merge";
    private static final int NOTIFICATION_ID = 2742;

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL, "Joy-Con左右統合", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Joy-Conの統合中にControllerMapをバックグラウンドで動作させる通知");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openApp = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID,
                new NotificationCompat.Builder(this, CHANNEL)
                    .setSmallIcon(android.R.drawable.stat_notify_sync)
                    .setContentTitle("ControllerMap · Joy-Con統合中")
                    .setContentText("左＋右の仮想ゲームパッドを維持中。タップでアプリに戻る")
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(openApp)
                    .build(),
                Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE : 0);
        } catch (RuntimeException error) {
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}

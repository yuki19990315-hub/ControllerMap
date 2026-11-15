package com.crosspad.controller;

/**
 * Original EVDEV/uinput Joy-Con L+R bridge. Calls execute in Shizuku's shell-UID
 * UserService, not the app UID. Device SELinux permissions are checked at runtime.
 */
final class JoyConNativeBridge {
    private static String loadedPath;
    private static String loadError;

    private JoyConNativeBridge() {}

    static synchronized String load(String libraryPath) {
        if (loadedPath != null) return "";
        if (loadError != null) return loadError;
        if (libraryPath == null || !libraryPath.endsWith("/libjoyconmerge.so")) {
            return "ネイティブライブラリのパスが不正です";
        }
        try {
            System.load(libraryPath);
            loadedPath = libraryPath;
            return "";
        } catch (Throwable error) {
            loadError = "Joy-Conライブラリを読み込めません: " + error.getMessage();
            return loadError;
        }
    }

    static synchronized boolean isLoaded() {
        return loadedPath != null;
    }

    static native String nativeProbe();
    static native String nativeStart();
    static native String nativeStatus();
    static native void nativeStop();
}

package com.crosspad.controller;

// Runs in Shizuku's shell-UID UserService; not an Android application Service.
interface IControllerUinputService {
    String probe();
    boolean start();
    void submit(String stateJson);
    void stop();
    void destroy() = 16777114;
}

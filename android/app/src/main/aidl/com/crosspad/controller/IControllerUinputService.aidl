package com.crosspad.controller;

// Runs in Shizuku's shell-UID UserService; not an Android application Service.
interface IControllerUinputService {
    String probe() = 1;
    boolean start() = 2;
    void submit(String stateJson) = 3;
    void stop() = 4;
    void destroy() = 16777114;
}

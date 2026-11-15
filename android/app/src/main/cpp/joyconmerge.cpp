// Copyright (c) 2026 ControllerMap contributors.
// Original Linux evdev/uinput implementation; no third-party Joy-Con source copied.
// This code must run as a Shizuku shell-UID UserService. On locked-down kernels
// /dev/input and/or /dev/uinput can be blocked, even with Shizuku running.

#include <jni.h>
#include <fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <poll.h>
#include <sys/ioctl.h>
#include <unistd.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace {

constexpr int kNintendoVendor = 0x057e;
constexpr int kLeftProduct = 0x2006;
constexpr int kRightProduct = 0x2007;
constexpr int kOutputVendor = 0x1209; // Community USB PID, not Sony/Microsoft/Nintendo identity.
constexpr int kOutputProduct = 0x7007;

struct Device {
    std::string path;
    std::string name;
    int xCode = ABS_X;
    int yCode = ABS_Y;
    input_absinfo xInfo{};
    input_absinfo yInfo{};
};

std::mutex gMutex;
std::thread gWorker;
std::atomic<bool> gStop{false};
bool gActive = false;
std::string gMessage = "未起動";
unsigned long gReports = 0;

bool hasAxis(int fd, int code, input_absinfo* info) {
    return ioctl(fd, EVIOCGABS(code), info) == 0 && info->maximum > info->minimum;
}

void detectAxes(int fd, Device& device, bool right) {
    // Each Joy-Con normally exposes ABS_X/Y. Some driver builds use RX/RY on R.
    if (right && hasAxis(fd, ABS_RX, &device.xInfo) && hasAxis(fd, ABS_RY, &device.yInfo)) {
        device.xCode = ABS_RX;
        device.yCode = ABS_RY;
        return;
    }
    if (hasAxis(fd, ABS_X, &device.xInfo) && hasAxis(fd, ABS_Y, &device.yInfo)) {
        device.xCode = ABS_X;
        device.yCode = ABS_Y;
        return;
    }
    if (hasAxis(fd, ABS_RX, &device.xInfo) && hasAxis(fd, ABS_RY, &device.yInfo)) {
        device.xCode = ABS_RX;
        device.yCode = ABS_RY;
    }
}

bool findJoyCons(Device& left, Device& right) {
    bool haveLeft = false;
    bool haveRight = false;
    for (int index = 0; index < 128; ++index) {
        char path[64];
        snprintf(path, sizeof(path), "/dev/input/event%d", index);
        int fd = open(path, O_RDONLY | O_NONBLOCK | O_CLOEXEC);
        if (fd < 0) continue;
        input_id id{};
        if (ioctl(fd, EVIOCGID, &id) == 0 && id.vendor == kNintendoVendor &&
            (id.product == kLeftProduct || id.product == kRightProduct)) {
            Device device;
            device.path = path;
            char name[128] = {};
            if (ioctl(fd, EVIOCGNAME(sizeof(name)), name) >= 0) device.name = name;
            detectAxes(fd, device, id.product == kRightProduct);
            if (id.product == kLeftProduct && !haveLeft) {
                left = device;
                haveLeft = true;
            } else if (id.product == kRightProduct && !haveRight) {
                right = device;
                haveRight = true;
            }
        }
        close(fd);
    }
    return haveLeft && haveRight;
}

std::string escapeJson(const std::string& text) {
    std::string value;
    for (unsigned char ch : text) {
        if (ch == '\\' || ch == '"') value.push_back('\\');
        if (ch >= 32 && ch < 127) value.push_back(static_cast<char>(ch));
        else if (ch >= 128) value += "?";
    }
    return value;
}

std::string statusJson(bool scan) {
    Device left, right;
    if (scan) findJoyCons(left, right);
    int uinput = open("/dev/uinput", O_WRONLY | O_NONBLOCK | O_CLOEXEC);
    const bool canUinput = uinput >= 0;
    if (canUinput) close(uinput);
    std::lock_guard<std::mutex> guard(gMutex);
    const bool leftReady = !left.path.empty();
    const bool rightReady = !right.path.empty();
    const bool ready = leftReady && rightReady && canUinput;
    std::string message = gMessage;
    if (!gActive && message == "未起動") {
        if (!leftReady || !rightReady) message = "左右のJoy-Conが見つかりません。AndroidのBluetooth設定から2本とも接続してください";
        else if (!canUinput) message = "この端末ではShizukuから/dev/uinputにアクセスできません";
        else message = "左右のJoy-Conを検出しました。統合開始を試せます";
    }
    return "{\"active\":" + std::string(gActive ? "true" : "false") +
        ",\"supported\":" + (ready ? "true" : "false") +
        ",\"leftConnected\":" + (leftReady ? "true" : "false") +
        ",\"rightConnected\":" + (rightReady ? "true" : "false") +
        ",\"uinputWritable\":" + (canUinput ? "true" : "false") +
        ",\"leftName\":\"" + escapeJson(left.name) + "\"" +
        ",\"rightName\":\"" + escapeJson(right.name) + "\"" +
        ",\"reports\":" + std::to_string(gReports) +
        ",\"message\":\"" + escapeJson(message) + "\"}";
}

bool allowEvent(int fd, int type, int code) {
    return ioctl(fd, type, code) == 0;
}

int makeVirtualPad() {
    int fd = open("/dev/uinput", O_WRONLY | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0) return -1;
    if (!allowEvent(fd, UI_SET_EVBIT, EV_KEY) || !allowEvent(fd, UI_SET_EVBIT, EV_ABS)) {
        close(fd);
        return -1;
    }
    const int keys[] = {BTN_SOUTH, BTN_EAST, BTN_NORTH, BTN_WEST, BTN_TL, BTN_TR,
                        BTN_TL2, BTN_TR2, BTN_SELECT, BTN_START, BTN_THUMBL,
                        BTN_THUMBR, BTN_MODE};
    const int axes[] = {ABS_X, ABS_Y, ABS_RX, ABS_RY, ABS_HAT0X, ABS_HAT0Y};
    for (int key : keys) {
        if (!allowEvent(fd, UI_SET_KEYBIT, key)) { close(fd); return -1; }
    }
    for (int axis : axes) {
        if (!allowEvent(fd, UI_SET_ABSBIT, axis)) { close(fd); return -1; }
        uinput_abs_setup setup{};
        setup.code = static_cast<__u16>(axis);
        setup.absinfo.minimum = (axis == ABS_HAT0X || axis == ABS_HAT0Y) ? -1 : -32767;
        setup.absinfo.maximum = (axis == ABS_HAT0X || axis == ABS_HAT0Y) ? 1 : 32767;
        setup.absinfo.flat = (axis == ABS_HAT0X || axis == ABS_HAT0Y) ? 0 : 1200;
        if (ioctl(fd, UI_ABS_SETUP, &setup) != 0) { close(fd); return -1; }
    }
    uinput_setup setup{};
    snprintf(setup.name, sizeof(setup.name), "CrossPad Joy-Con L+R");
    setup.id.bustype = BUS_VIRTUAL;
    setup.id.vendor = kOutputVendor;
    setup.id.product = kOutputProduct;
    setup.id.version = 1;
    if (ioctl(fd, UI_DEV_SETUP, &setup) != 0 || ioctl(fd, UI_DEV_CREATE) != 0) {
        close(fd);
        return -1;
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(400));
    return fd;
}

int scaleAxis(int value, const input_absinfo& info) {
    if (info.maximum <= info.minimum) return 0;
    const double ratio = static_cast<double>(value - info.minimum) /
        static_cast<double>(info.maximum - info.minimum);
    int scaled = static_cast<int>(std::lround((ratio * 2.0 - 1.0) * 32767));
    scaled = std::max(-32767, std::min(32767, scaled));
    return std::abs(scaled) <= 1100 ? 0 : scaled;
}

int mapKey(int side, int code) {
    // Standard Linux hid-nintendo mappings. The precise mapping is kernel-dependent.
    if (side == 0) {
        switch (code) {
            case BTN_TL: return BTN_TL;
            case BTN_TL2: return BTN_TL2;
            case BTN_SELECT: return BTN_SELECT;
            case BTN_THUMBL: return BTN_THUMBL;
            default: return -1;
        }
    }
    switch (code) {
        case BTN_SOUTH: return BTN_SOUTH;
        case BTN_EAST: return BTN_EAST;
        case BTN_NORTH: return BTN_NORTH;
        case BTN_WEST: return BTN_WEST;
        case BTN_TR: return BTN_TR;
        case BTN_TR2: return BTN_TR2;
        case BTN_START: return BTN_START;
        case BTN_THUMBR: return BTN_THUMBR;
        case BTN_MODE: return BTN_MODE;
        default: return -1;
    }
}

struct Pad {
    int leftX = 0, leftY = 0, rightX = 0, rightY = 0;
    int hatX = 0, hatY = 0;
    bool up = false, down = false, left = false, right = false;
    bool keys[KEY_MAX + 1]{};
    std::vector<input_event> frame;

    void send(int type, int code, int value) {
        input_event event{};
        event.type = static_cast<__u16>(type);
        event.code = static_cast<__u16>(code);
        event.value = value;
        frame.push_back(event);
    }

    void key(int code, bool pressed) {
        if (code < 0 || code > KEY_MAX || keys[code] == pressed) return;
        keys[code] = pressed;
        send(EV_KEY, code, pressed ? 1 : 0);
    }

    void axis(int code, int value, int& previous) {
        if (previous == value) return;
        previous = value;
        send(EV_ABS, code, value);
    }

    void hat() {
        axis(ABS_HAT0X, static_cast<int>(right) - static_cast<int>(left), hatX);
        axis(ABS_HAT0Y, static_cast<int>(down) - static_cast<int>(up), hatY);
    }

    void flush(int output) {
        if (frame.empty()) return;
        send(EV_SYN, SYN_REPORT, 0);
        const ssize_t expected = static_cast<ssize_t>(frame.size() * sizeof(input_event));
        const ssize_t wrote = write(output, frame.data(), static_cast<size_t>(expected));
        if (wrote == expected) {
            std::lock_guard<std::mutex> guard(gMutex);
            ++gReports;
        }
        frame.clear();
    }
};

void applyInput(Pad& pad, int side, const Device& device, const input_event& input) {
    if (input.type == EV_KEY && (input.value == 0 || input.value == 1)) {
        int out = mapKey(side, input.code);
        if (out >= 0) pad.key(out, input.value != 0);
        // D-pad may be exposed as buttons rather than ABS_HAT axes.
        if (side == 0) {
            switch (input.code) {
                case BTN_DPAD_UP: pad.up = input.value != 0; break;
                case BTN_DPAD_DOWN: pad.down = input.value != 0; break;
                case BTN_DPAD_LEFT: pad.left = input.value != 0; break;
                case BTN_DPAD_RIGHT: pad.right = input.value != 0; break;
                default: break;
            }
            pad.hat();
        }
    }
    if (input.type == EV_ABS) {
        if (input.code == device.xCode) {
            const int value = scaleAxis(input.value, device.xInfo);
            if (side == 0) pad.axis(ABS_X, value, pad.leftX);
            else pad.axis(ABS_RX, value, pad.rightX);
        } else if (input.code == device.yCode) {
            const int value = scaleAxis(input.value, device.yInfo);
            if (side == 0) pad.axis(ABS_Y, value, pad.leftY);
            else pad.axis(ABS_RY, value, pad.rightY);
        } else if (side == 0 && input.code == ABS_HAT0X) {
            pad.axis(ABS_HAT0X, std::max(-1, std::min(1, input.value)), pad.hatX);
        } else if (side == 0 && input.code == ABS_HAT0Y) {
            pad.axis(ABS_HAT0Y, std::max(-1, std::min(1, input.value)), pad.hatY);
        }
    }
}

void worker(int leftFd, int rightFd, int output, Device left, Device right) {
    Pad pad;
    pollfd sources[2] = {{leftFd, POLLIN, 0}, {rightFd, POLLIN, 0}};
    while (!gStop.load()) {
        const int count = poll(sources, 2, 250);
        if (count < 0) break;
        if (count == 0) continue;
        bool disconnected = false;
        for (int side = 0; side < 2; ++side) {
            if (sources[side].revents & (POLLERR | POLLHUP | POLLNVAL)) {
                disconnected = true;
                break;
            }
            if ((sources[side].revents & POLLIN) == 0) continue;
            input_event events[64];
            const ssize_t bytes = read(sources[side].fd, events, sizeof(events));
            if (bytes <= 0) continue;
            for (size_t index = 0; index < static_cast<size_t>(bytes) / sizeof(input_event); ++index) {
                const input_event& event = events[index];
                if (event.type == EV_SYN && event.code == SYN_REPORT) pad.flush(output);
                else if (event.type == EV_SYN && event.code == SYN_DROPPED) {
                    // Don't pass a partial frame after losing events.
                    pad.frame.clear();
                } else applyInput(pad, side, side == 0 ? left : right, event);
            }
            pad.flush(output);
        }
        if (disconnected) {
            std::lock_guard<std::mutex> guard(gMutex);
            gMessage = "Joy-Conの接続が切れました。Bluetoothを再接続して統合を再開してください";
            break;
        }
    }
    ioctl(leftFd, EVIOCGRAB, 0);
    ioctl(rightFd, EVIOCGRAB, 0);
    close(leftFd);
    close(rightFd);
    ioctl(output, UI_DEV_DESTROY);
    close(output);
    std::lock_guard<std::mutex> guard(gMutex);
    gActive = false;
}

void stop() {
    gStop.store(true);
    if (gWorker.joinable()) gWorker.join();
    gStop.store(false);
    std::lock_guard<std::mutex> guard(gMutex);
    gActive = false;
}

std::string start() {
    stop();
    Device left, right;
    if (!findJoyCons(left, right)) {
        {
            std::lock_guard<std::mutex> guard(gMutex);
            gMessage = "左右のJoy-Con（057e:2006 / 057e:2007）が見つかりません。Bluetooth設定で2本を接続してください";
        }
        return statusJson(true);
    }
    int leftFd = open(left.path.c_str(), O_RDONLY | O_NONBLOCK | O_CLOEXEC);
    int rightFd = open(right.path.c_str(), O_RDONLY | O_NONBLOCK | O_CLOEXEC);
    if (leftFd < 0 || rightFd < 0) {
        if (leftFd >= 0) close(leftFd);
        if (rightFd >= 0) close(rightFd);
        { std::lock_guard<std::mutex> guard(gMutex); gMessage = "端末の権限設定によりJoy-Con入力を読み取れません"; }
        return statusJson(true);
    }
    int output = makeVirtualPad();
    if (output < 0) {
        close(leftFd);
        close(rightFd);
        { std::lock_guard<std::mutex> guard(gMutex); gMessage = "端末が/dev/uinputの作成を拒否しました（SELinuxの可能性）"; }
        return statusJson(true);
    }
    if (ioctl(leftFd, EVIOCGRAB, 1) != 0 || ioctl(rightFd, EVIOCGRAB, 1) != 0) {
        ioctl(leftFd, EVIOCGRAB, 0);
        ioctl(rightFd, EVIOCGRAB, 0);
        close(leftFd);
        close(rightFd);
        ioctl(output, UI_DEV_DESTROY);
        close(output);
        { std::lock_guard<std::mutex> guard(gMutex); gMessage = "Joy-Conの排他取得が端末に拒否されました（EVIOCGRAB）"; }
        return statusJson(true);
    }
    {
        std::lock_guard<std::mutex> guard(gMutex);
        gReports = 0;
        gActive = true;
        gMessage = "統合中。ゲームにはCrossPad Joy-Con L+Rとして表示される予定です";
    }
    gWorker = std::thread(worker, leftFd, rightFd, output, left, right);
    return statusJson(true);
}

jstring toJava(JNIEnv* env, const std::string& text) {
    return env->NewStringUTF(text.c_str());
}

} // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_com_crosspad_controller_JoyConNativeBridge_nativeProbe(JNIEnv* env, jclass) {
    return toJava(env, statusJson(true));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_crosspad_controller_JoyConNativeBridge_nativeStart(JNIEnv* env, jclass) {
    return toJava(env, start());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_crosspad_controller_JoyConNativeBridge_nativeStatus(JNIEnv* env, jclass) {
    return toJava(env, statusJson(true));
}

extern "C" JNIEXPORT void JNICALL
Java_com_crosspad_controller_JoyConNativeBridge_nativeStop(JNIEnv*, jclass) {
    stop();
    std::lock_guard<std::mutex> guard(gMutex);
    gMessage = "統合を停止しました";
}

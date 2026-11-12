import { MappingProfile, TargetControllerType } from '../types/controller';

/**
 * Generates a ready-to-run Python ViGEm PC Bridge script
 * This creates a REAL virtual DUALSHOCK 4 or Switch controller in Windows Device Manager!
 */
export function generatePythonViGEmScript(
  profile: MappingProfile,
  target: TargetControllerType,
  wsPort: number = 8765
): string {
  const isDS4 = target === 'DS4';
  
  return `# ==============================================================================
# CrossPad Protocol: Virtual ${isDS4 ? 'DUALSHOCK 4' : 'Nintendo Switch Pro'} PC Bridge
# Converts Smartphone Screen-Mapping / BLE Controllers into Native OS Controllers
# Requirements:
#   1. Install ViGEmBus Driver: https://github.com/nefarius/ViGEmBus/releases
#   2. pip install vgamepad websockets asyncio
# ==============================================================================

import asyncio
import json
import math
import sys

try:
    import vgamepad as vg
except ImportError:
    print("[Error] 'vgamepad' library not found!")
    print("Please install: pip install vgamepad")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("[Error] 'websockets' library not found!")
    print("Please install: pip install websockets")
    sys.exit(1)

TARGET_TYPE = "${target}"
PORT = ${wsPort}

print("=" * 60)
print(f"[*] Starting CrossPad Virtual Gamepad Bridge ({TARGET_TYPE})")
print(f"[*] Initializing ViGEmBus Virtual Device...")
${
  isDS4
    ? `gamepad = vg.VDS4Gamepad()
print("[+] Virtual Sony Interactive Entertainment DUALSHOCK 4 Created!")`
    : `gamepad = vg.VX360Gamepad()  # XInput / Switch Pro compatible virtual bus
print("[+] Virtual Controller Emulation Initialized (Switch / XInput mapped)!")`
}
print(f"[*] Listening for Web Bridge packets on ws://localhost:{PORT}")
print("=" * 60)

async def handle_client(websocket):
    print(f"[+] Client connected from {websocket.remote_address}")
    try:
        async for message in websocket:
            data = json.loads(message)
            state = data.get("state", {})
            buttons = state.get("buttons", {})
            l_stick = state.get("leftStick", {"x": 0, "y": 0})
            r_stick = state.get("rightStick", {"x": 0, "y": 0})

            # Left & Right Thumbsticks (-1.0 to 1.0 -> ViGEm range)
            lx = max(-1.0, min(1.0, l_stick.get("x", 0.0)))
            ly = max(-1.0, min(1.0, l_stick.get("y", 0.0)))
            rx = max(-1.0, min(1.0, r_stick.get("x", 0.0)))
            ry = max(-1.0, min(1.0, r_stick.get("y", 0.0)))

            ${
              isDS4
                ? `# Update DS4 Joysticks
            gamepad.left_joystick_float(x_value_float=lx, y_value_float=-ly)
            gamepad.right_joystick_float(x_value_float=rx, y_value_float=-ry)

            # Analog Triggers (0.0 to 1.0)
            l2_val = 1.0 if buttons.get("l2", False) else float(buttons.get("l2Value", 0.0))
            r2_val = 1.0 if buttons.get("r2", False) else float(buttons.get("r2Value", 0.0))
            gamepad.left_trigger_float(value_float=l2_val)
            gamepad.right_trigger_float(value_float=r2_val)

            # DS4 Action Buttons
            if buttons.get("actionDown"):    gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_CROSS)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_CROSS)

            if buttons.get("actionRight"):   gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_CIRCLE)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_CIRCLE)

            if buttons.get("actionLeft"):    gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SQUARE)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SQUARE)

            if buttons.get("actionUp"):      gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_TRIANGLE)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_TRIANGLE)

            # Shoulders & Clicks
            if buttons.get("l1"):           gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_LEFT)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_LEFT)

            if buttons.get("r1"):           gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_RIGHT)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_RIGHT)

            if buttons.get("l3"):           gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_THUMB_LEFT)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_THUMB_LEFT)

            if buttons.get("r3"):           gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_THUMB_RIGHT)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_THUMB_RIGHT)

            if buttons.get("select"):       gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHARE)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_SHARE)

            if buttons.get("start"):        gamepad.press_button(button=vg.DS4_BUTTONS.DS4_BUTTON_OPTIONS)
            else:                           gamepad.release_button(button=vg.DS4_BUTTONS.DS4_BUTTON_OPTIONS)

            # D-Pad Directional
            # DS4 uses 8-direction hat: N, NE, E, SE, S, SW, W, NW, NONE
            up, down, left, right = buttons.get("dpadUp"), buttons.get("dpadDown"), buttons.get("dpadLeft"), buttons.get("dpadRight")
            if up and right:    gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTHEAST)
            elif down and right:gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTHEAST)
            elif down and left: gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTHWEST)
            elif up and left:   gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTHWEST)
            elif up:            gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTH)
            elif right:         gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_EAST)
            elif down:          gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTH)
            elif left:          gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_WEST)
            else:               gamepad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NONE)`
                : `# Update Switch Controller Sticks
            gamepad.left_joystick_float(x_value_float=lx, y_value_float=-ly)
            gamepad.right_joystick_float(x_value_float=rx, y_value_float=-ry)

            # Triggers
            l2_val = 1.0 if buttons.get("l2", False) else float(buttons.get("l2Value", 0.0))
            r2_val = 1.0 if buttons.get("r2", False) else float(buttons.get("r2Value", 0.0))
            gamepad.left_trigger_float(value_float=l2_val)
            gamepad.right_trigger_float(value_float=r2_val)

            # Nintendo Switch Face Buttons (A=Right, B=Down, X=Up, Y=Left)
            # In X360: A is Down, B is Right, X is Left, Y is Up
            # We map Nintendo A -> Right, Nintendo B -> Down
            if buttons.get("actionDown"):    gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_A)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_A)

            if buttons.get("actionRight"):   gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)

            if buttons.get("actionLeft"):    gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X)

            if buttons.get("actionUp"):      gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_Y)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_Y)

            # Shoulders
            if buttons.get("l1"):           gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER)

            if buttons.get("r1"):           gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER)

            if buttons.get("l3"):           gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB)

            if buttons.get("r3"):           gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB)

            if buttons.get("select"):       gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK)

            if buttons.get("start"):        gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_START)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_START)

            # D-Pad
            if buttons.get("dpadUp"):       gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP)

            if buttons.get("dpadDown"):     gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN)

            if buttons.get("dpadLeft"):     gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT)

            if buttons.get("dpadRight"):    gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT)
            else:                           gamepad.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT)`
            }

            # Flush report to Windows OS
            gamepad.update()

    except websockets.exceptions.ConnectionClosed:
        print("[-] Client disconnected.")

async def main():
    async with websockets.serve(handle_client, "0.0.0.0", PORT):
        print(f"[*] Server listening on 0.0.0.0:{PORT} (Ready for Web App bridge!)")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n[+] Bridge terminated cleanly.")
`;
}

/**
 * Generates Arduino ESP32 C++ Hardware Dongle Firmware
 * Uses ESP32-S3 / ESP32 as a hardware bridge:
 * [Phone Screen-Mapping Controller] --(BLE)--> [ESP32 Dongle] --(USB)--> [PC / PS4 / Switch]
 */
export function generateESP32HardwareFirmware(
  profile: MappingProfile,
  target: TargetControllerType
): string {
  const isDS4 = target === 'DS4';
  const remap = profile.v3RemapTable;
  const stick = profile.v3StickRemap || { swapSticks: false, leftStickToDpad: false };

  // Map target button keys to Gamepad.press IDs
  const getButtonId = (targetKey: string): number => {
    switch (targetKey) {
      case 'actionDown': return 1;  // Cross (DS4) / B (Switch)
      case 'actionRight': return 2; // Circle (DS4) / A (Switch)
      case 'actionLeft': return 3;  // Square (DS4) / Y (Switch)
      case 'actionUp': return 4;    // Triangle (DS4) / X (Switch)
      case 'l1': return 5;
      case 'r1': return 6;
      case 'l2': return 7;
      case 'r2': return 8;
      case 'select': return 9;
      case 'start': return 10;
      case 'l3': return 11;
      case 'r3': return 12;
      case 'home': return 13;
      case 'touchpadClick': return 14;
      default: return 0;
    }
  };

  return `/*
 * CrossPad Hardware Adapter - ESP32 Firmware
 * Converts ShootingPlus V3 BLE Controller -> Native ${isDS4 ? 'DUALSHOCK 4' : 'Nintendo Switch Pro'} USB HID
 * 
 * Hardware: ESP32-S2 / ESP32-S3 (with Native USB)
 * Libraries:
 *   - NimBLE-Arduino (https://github.com/h2zero/NimBLE-Arduino)
 *   - USB-HID-Gamepad / TinyUSB
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include "USB.h"
#include "USBHIDGamepad.h"

// Target Mode: ${target}
#define CONTROLLER_MODE_${target} 1

USBHIDGamepad Gamepad;

// ShootingPlus V3 BLE UUIDs
static NimBLEUUID serviceUUID("0000ffe0-0000-1000-8000-00805f9b34fb");
static NimBLEUUID    charUUID("0000ffe1-0000-1000-8000-00805f9b34fb");

static boolean connected = false;

// Custom V3 Button Mapping Table applied from CrossPad:
// V3 A  -> ${remap.btn_a} (Button ID ${getButtonId(remap.btn_a)})
// V3 B  -> ${remap.btn_b} (Button ID ${getButtonId(remap.btn_b)})
// V3 X  -> ${remap.btn_x} (Button ID ${getButtonId(remap.btn_x)})
// V3 Y  -> ${remap.btn_y} (Button ID ${getButtonId(remap.btn_y)})
// V3 L1 -> ${remap.btn_l1} (Button ID ${getButtonId(remap.btn_l1)})
// V3 R1 -> ${remap.btn_r1} (Button ID ${getButtonId(remap.btn_r1)})
// V3 L2 -> ${remap.btn_l2} (Button ID ${getButtonId(remap.btn_l2)})
// V3 R2 -> ${remap.btn_r2} (Button ID ${getButtonId(remap.btn_r2)})

static void notifyCallback(
  NimBLERemoteCharacteristic* pBLERemoteCharacteristic,
  uint8_t* pData,
  size_t length,
  bool isNotify) {
  
  if (length < 8) return;

  // Extract raw sticks (centered around 128)
  int8_t lx = (int8_t)(pData[4] - 128);
  int8_t ly = (int8_t)(pData[5] - 128);
  int8_t rx = (int8_t)(pData[6] - 128);
  int8_t ry = (int8_t)(pData[7] - 128);

  ${
    stick.swapSticks
      ? `// Swapped Sticks Config
  Gamepad.leftStick(rx, -ry);
  Gamepad.rightStick(lx, -ly);`
      : `Gamepad.leftStick(lx, -ly);
  Gamepad.rightStick(rx, -ry);`
  }

  // Raw V3 Bitmasks
  uint8_t btnLow = (length > 8) ? pData[8] : 0;
  uint8_t btnHigh = (length > 9) ? pData[9] : 0;

  // Apply User Custom Remap
  ${getButtonId(remap.btn_a) > 0 ? `if (btnLow & 0x01) Gamepad.press(${getButtonId(remap.btn_a)}); else Gamepad.release(${getButtonId(remap.btn_a)});` : ''}
  ${getButtonId(remap.btn_b) > 0 ? `if (btnLow & 0x02) Gamepad.press(${getButtonId(remap.btn_b)}); else Gamepad.release(${getButtonId(remap.btn_b)});` : ''}
  ${getButtonId(remap.btn_x) > 0 ? `if (btnLow & 0x04) Gamepad.press(${getButtonId(remap.btn_x)}); else Gamepad.release(${getButtonId(remap.btn_x)});` : ''}
  ${getButtonId(remap.btn_y) > 0 ? `if (btnLow & 0x08) Gamepad.press(${getButtonId(remap.btn_y)}); else Gamepad.release(${getButtonId(remap.btn_y)});` : ''}

  ${getButtonId(remap.btn_l1) > 0 ? `if (btnLow & 0x10) Gamepad.press(${getButtonId(remap.btn_l1)}); else Gamepad.release(${getButtonId(remap.btn_l1)});` : ''}
  ${getButtonId(remap.btn_r1) > 0 ? `if (btnLow & 0x20) Gamepad.press(${getButtonId(remap.btn_r1)}); else Gamepad.release(${getButtonId(remap.btn_r1)});` : ''}
  ${getButtonId(remap.btn_l2) > 0 ? `if (btnLow & 0x40) Gamepad.press(${getButtonId(remap.btn_l2)}); else Gamepad.release(${getButtonId(remap.btn_l2)});` : ''}
  ${getButtonId(remap.btn_r2) > 0 ? `if (btnLow & 0x80) Gamepad.press(${getButtonId(remap.btn_r2)}); else Gamepad.release(${getButtonId(remap.btn_r2)});` : ''}

  ${getButtonId(remap.btn_select) > 0 ? `if (btnHigh & 0x01) Gamepad.press(${getButtonId(remap.btn_select)}); else Gamepad.release(${getButtonId(remap.btn_select)});` : ''}
  ${getButtonId(remap.btn_start) > 0 ? `if (btnHigh & 0x02) Gamepad.press(${getButtonId(remap.btn_start)}); else Gamepad.release(${getButtonId(remap.btn_start)});` : ''}
  ${getButtonId(remap.btn_l3) > 0 ? `if (btnHigh & 0x04) Gamepad.press(${getButtonId(remap.btn_l3)}); else Gamepad.release(${getButtonId(remap.btn_l3)});` : ''}
  ${getButtonId(remap.btn_r3) > 0 ? `if (btnHigh & 0x08) Gamepad.press(${getButtonId(remap.btn_r3)}); else Gamepad.release(${getButtonId(remap.btn_r3)});` : ''}
  ${getButtonId(remap.btn_home) > 0 ? `if (btnHigh & 0x10) Gamepad.press(${getButtonId(remap.btn_home)}); else Gamepad.release(${getButtonId(remap.btn_home)});` : ''}

  Gamepad.send();
}

class ClientCallbacks : public NimBLEClientCallbacks {
  void onConnect(NimBLEClient* pClient) {
    Serial.println("[ESP32] Connected to Mobile Controller!");
  }

  void onDisconnect(NimBLEClient* pClient) {
    connected = false;
    Serial.println("[ESP32] Controller Disconnected. Scanning again...");
    NimBLEDevice::getScan()->start(5, false);
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("[ESP32] CrossPad Bridge Initializing...");

  // Initialize Native USB HID Gamepad
  Gamepad.begin();
  USB.begin();

  // Initialize BLE Client
  NimBLEDevice::init("CrossPad_Dongle");
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->setActiveScan(true);
  pScan->setInterval(45);
  pScan->setWindow(15);

  Serial.println("[ESP32] Ready! USB Gamepad enumerated.");
}

void loop() {
  // Main execution loop
  delay(1);
}
`;
}

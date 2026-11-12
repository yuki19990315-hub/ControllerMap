export type TargetControllerType = 'DS4' | 'SWITCH_PRO';

export type InputProtocolType = 
  | 'SHOOTING_PLUS_V3' 
  | 'FLYDIGI_FLASHPLAY' 
  | 'GAMESIR_GTOUCH'
  | 'STANDARD_GAMEPAD'
  | 'KEYBOARD_MOUSE'
  | 'VIRTUAL_TOUCH';

export type StickCurveType = 'linear' | 'exponential' | 's_curve' | 'aggressive' | 'precision';

export interface StickCalibration {
  deadzoneInner: number; // 0.0 - 0.5 (default 0.08)
  deadzoneOuter: number; // 0.5 - 1.0 (default 0.98)
  antiDeadzone: number;  // 0.0 - 0.4
  sensitivity: number;   // 0.5 - 2.5 (default 1.0)
  curve: StickCurveType;
  invertX: boolean;
  invertY: boolean;
}

export interface GyroCalibration {
  enabled: boolean;
  sensitivity: number;
  deadzone: number;
  invertPitch: boolean;
  invertYaw: boolean;
  invertRoll: boolean;
  mapToRightStick: boolean;
}

export interface ScreenMappingNode {
  id: string;
  label: string;
  type: 'button' | 'joystick' | 'camera_swipe' | 'macro';
  targetButton?: string; // e.g. 'cross', 'circle', 'A', 'B', 'L1', 'R2'
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  radius?: number; // percentage or px
  touchId?: number | null;
  isPressed?: boolean;
  swipeSpeed?: number;
  macroSteps?: Array<{ button: string; delayMs: number }>;
}

export interface GamepadState {
  // Common state normalized to 0-1 and booleans
  buttons: {
    // Face buttons
    dpadUp: boolean;
    dpadDown: boolean;
    dpadLeft: boolean;
    dpadRight: boolean;
    
    // Action buttons (Primary)
    // DS4: Cross, Switch: B
    actionDown: boolean;
    // DS4: Circle, Switch: A
    actionRight: boolean;
    // DS4: Square, Switch: Y
    actionLeft: boolean;
    // DS4: Triangle, Switch: X
    actionUp: boolean;

    // Bumpers & Triggers
    l1: boolean;
    r1: boolean;
    l2: boolean;
    r2: boolean;
    l2Value: number; // 0.0 - 1.0 analog trigger pressure
    r2Value: number; // 0.0 - 1.0 analog trigger pressure

    // Stick clicks
    l3: boolean;
    r3: boolean;

    // Menu buttons
    select: boolean; // Share / Minus
    start: boolean;  // Options / Plus
    home: boolean;   // PS / Home
    touchpadClick: boolean; // DS4 Touchpad / Switch Capture
  };

  // Analog Sticks: -1.0 to +1.0
  leftStick: {
    x: number;
    y: number;
  };
  rightStick: {
    x: number;
    y: number;
  };

  // Motion / Gyro
  gyro: {
    pitch: number; // degrees/sec or normalized
    roll: number;
    yaw: number;
    accelX: number;
    accelY: number;
    accelZ: number;
  };

  // DS4 specific extras
  ds4: {
    touchpad1: { active: boolean; x: number; y: number };
    touchpad2: { active: boolean; x: number; y: number };
    lightbarColor: string; // hex
    batteryLevel: number; // 0 - 100
  };

  // Raw telemetry
  rawHexPacket?: string;
  lastPacketTime?: number;
  packetCounter: number;
}

export type V3PhysicalButton = 
  | 'btn_a'
  | 'btn_b'
  | 'btn_x'
  | 'btn_y'
  | 'btn_l1'
  | 'btn_r1'
  | 'btn_l2'
  | 'btn_r2'
  | 'btn_l3'
  | 'btn_r3'
  | 'btn_select'
  | 'btn_start'
  | 'btn_home'
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right';

export type TargetGamepadButtonKey =
  | 'actionDown'      // DS4: Cross ✕ / Switch: B
  | 'actionRight'     // DS4: Circle ○ / Switch: A
  | 'actionLeft'      // DS4: Square □ / Switch: Y
  | 'actionUp'        // DS4: Triangle △ / Switch: X
  | 'l1'              // DS4: L1 / Switch: L
  | 'r1'              // DS4: R1 / Switch: R
  | 'l2'              // DS4: L2 / Switch: ZL
  | 'r2'              // DS4: R2 / Switch: ZR
  | 'l3'              // Left Stick Click
  | 'r3'              // Right Stick Click
  | 'dpadUp'          // D-Pad Up
  | 'dpadDown'        // D-Pad Down
  | 'dpadLeft'        // D-Pad Left
  | 'dpadRight'       // D-Pad Right
  | 'select'          // Share / Minus
  | 'start'           // Options / Plus
  | 'home'            // PS Button / Home
  | 'touchpadClick'   // Touchpad / Capture
  | 'none';           // Unassigned

export type V3ButtonRemapTable = Record<V3PhysicalButton, TargetGamepadButtonKey>;

export interface V3StickRemapConfig {
  swapSticks: boolean;      // Swap left & right sticks
  leftStickToDpad: boolean; // Also output left stick as D-Pad
}

export interface MappingProfile {
  id: string;
  name: string;
  gameTitle: string;
  description: string;
  screenAspectRatio: '16:9' | '20:9' | '4:3';
  nodes: ScreenMappingNode[];
  v3RemapTable: V3ButtonRemapTable;
  v3StickRemap?: V3StickRemapConfig;
  leftStickCalibration: StickCalibration;
  rightStickCalibration: StickCalibration;
  gyroCalibration: GyroCalibration;
  turboButtons: { [buttonKey: string]: boolean };
  turboRateHz: number; // 5 - 30
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'ble' | 'webhid' | 'gamepad_api' | 'virtual';
  protocol: InputProtocolType;
  connected: boolean;
  battery?: number;
  details?: string;
}

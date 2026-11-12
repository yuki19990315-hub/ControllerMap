import { GamepadState, StickCalibration, StickCurveType, V3ButtonRemapTable, V3PhysicalButton, V3StickRemapConfig } from '../types/controller';

/**
 * Apply deadzone, anti-deadzone, and non-linear response curves to analog stick values (-1 to +1)
 */
export function applyStickCurve(
  rawX: number,
  rawY: number,
  calib: StickCalibration
): { x: number; y: number } {
  // Magnitude & Angle
  const magnitude = Math.sqrt(rawX * rawX + rawY * rawY);
  if (magnitude < 0.0001) {
    return { x: 0, y: 0 };
  }

  const normX = rawX / magnitude;
  const normY = rawY / magnitude;

  // Deadzone filtering
  if (magnitude <= calib.deadzoneInner) {
    return { x: 0, y: 0 };
  }

  // Rescale range between inner and outer deadzone
  const clampedMag = Math.min(magnitude, calib.deadzoneOuter);
  const normalizedMag = Math.max(0, (clampedMag - calib.deadzoneInner) / (calib.deadzoneOuter - calib.deadzoneInner));

  // Apply curve
  let curvedMag = normalizedMag;
  switch (calib.curve) {
    case 'exponential':
      curvedMag = Math.pow(normalizedMag, 2.2);
      break;
    case 'aggressive':
      curvedMag = Math.pow(normalizedMag, 0.65);
      break;
    case 's_curve':
      curvedMag = normalizedMag * normalizedMag * (3 - 2 * normalizedMag);
      break;
    case 'precision':
      curvedMag = Math.pow(normalizedMag, 3.0);
      break;
    case 'linear':
    default:
      curvedMag = normalizedMag;
      break;
  }

  // Apply anti-deadzone
  if (curvedMag > 0 && calib.antiDeadzone > 0) {
    curvedMag = calib.antiDeadzone + curvedMag * (1.0 - calib.antiDeadzone);
  }

  // Apply overall sensitivity multiplier
  curvedMag = Math.min(1.0, curvedMag * calib.sensitivity);

  let finalX = normX * curvedMag * (calib.invertX ? -1 : 1);
  let finalY = normY * curvedMag * (calib.invertY ? -1 : 1);

  return {
    x: Math.max(-1.0, Math.min(1.0, finalX)),
    y: Math.max(-1.0, Math.min(1.0, finalY)),
  };
}

/**
 * Parses raw 16-byte ShootingPlus V3 BLE GATT notification packet
 * Used by popular mobile mapping controllers (Ipega, ShanWan, Mocute, Flydigi V3 mode)
 * Applies custom V3-to-Target button remapping table!
 */
export function parseShootingPlusV3Packet(
  data: Uint8Array | number[],
  currentState: GamepadState,
  leftCalib: StickCalibration,
  rightCalib: StickCalibration,
  remapTable?: V3ButtonRemapTable,
  stickRemap?: V3StickRemapConfig
): GamepadState {
  if (data.length < 8) return currentState;

  // Convert to array
  const bytes = Array.from(data);

  // Default axes are in byte 4-7, centered around 128 (0x80)
  const lxRaw = bytes.length > 4 ? (bytes[4] - 128) / 128 : 0;
  // ShootingPlus V3 Y axis is inverted (0 is top, 255 is bottom)
  const lyRaw = bytes.length > 5 ? -((bytes[5] - 128) / 128) : 0;
  const rxRaw = bytes.length > 6 ? (bytes[6] - 128) / 128 : 0;
  const ryRaw = bytes.length > 7 ? -((bytes[7] - 128) / 128) : 0;

  const leftStick = applyStickCurve(lxRaw, lyRaw, leftCalib);
  const rightStick = applyStickCurve(rxRaw, ryRaw, rightCalib);

  // Button Bitmasks (Byte 8 & 9)
  const btnLow = bytes.length > 8 ? bytes[8] : 0;
  const btnHigh = bytes.length > 9 ? bytes[9] : 0;
  const dpadByte = bytes.length > 10 ? bytes[10] : 0xFF;

  // Extract raw D-pad
  let rawDpadUp = false;
  let rawDpadDown = false;
  let rawDpadLeft = false;
  let rawDpadRight = false;

  if (dpadByte <= 7) {
    rawDpadUp = dpadByte === 7 || dpadByte === 0 || dpadByte === 1;
    rawDpadRight = dpadByte === 1 || dpadByte === 2 || dpadByte === 3;
    rawDpadDown = dpadByte === 3 || dpadByte === 4 || dpadByte === 5;
    rawDpadLeft = dpadByte === 5 || dpadByte === 6 || dpadByte === 7;
  } else {
    rawDpadUp = (btnHigh & 0x20) !== 0;
    rawDpadDown = (btnHigh & 0x40) !== 0;
    rawDpadLeft = (btnHigh & 0x80) !== 0;
    rawDpadRight = (dpadByte & 0x01) !== 0;
  }

  // Physical V3 button states directly from hardware
  const v3PhysicalStates: Record<V3PhysicalButton, boolean> = {
    btn_a: (btnLow & 0x01) !== 0,
    btn_b: (btnLow & 0x02) !== 0,
    btn_x: (btnLow & 0x04) !== 0,
    btn_y: (btnLow & 0x08) !== 0,
    btn_l1: (btnLow & 0x10) !== 0,
    btn_r1: (btnLow & 0x20) !== 0,
    btn_l2: (btnLow & 0x40) !== 0,
    btn_r2: (btnLow & 0x80) !== 0,
    btn_select: (btnHigh & 0x01) !== 0,
    btn_start: (btnHigh & 0x02) !== 0,
    btn_l3: (btnHigh & 0x04) !== 0,
    btn_r3: (btnHigh & 0x08) !== 0,
    btn_home: (btnHigh & 0x10) !== 0,
    dpad_up: rawDpadUp,
    dpad_down: rawDpadDown,
    dpad_left: rawDpadLeft,
    dpad_right: rawDpadRight,
  };

  // Re-map to Target DUALSHOCK / Switch buttons
  const mappedButtons = {
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    actionDown: false,
    actionRight: false,
    actionLeft: false,
    actionUp: false,
    l1: false,
    r1: false,
    l2: false,
    r2: false,
    l2Value: 0,
    r2Value: 0,
    l3: false,
    r3: false,
    select: false,
    start: false,
    home: false,
    touchpadClick: false,
  };

  if (remapTable) {
    for (const [v3Key, targetKey] of Object.entries(remapTable)) {
      const isPressed = v3PhysicalStates[v3Key as V3PhysicalButton];
      if (isPressed && targetKey && targetKey !== 'none') {
        (mappedButtons as any)[targetKey] = true;
        if (targetKey === 'l2') mappedButtons.l2Value = 1.0;
        if (targetKey === 'r2') mappedButtons.r2Value = 1.0;
      }
    }
  } else {
    // 1:1 default fallback
    mappedButtons.actionDown = v3PhysicalStates.btn_a;
    mappedButtons.actionRight = v3PhysicalStates.btn_b;
    mappedButtons.actionLeft = v3PhysicalStates.btn_x;
    mappedButtons.actionUp = v3PhysicalStates.btn_y;
    mappedButtons.l1 = v3PhysicalStates.btn_l1;
    mappedButtons.r1 = v3PhysicalStates.btn_r1;
    mappedButtons.l2 = v3PhysicalStates.btn_l2;
    mappedButtons.r2 = v3PhysicalStates.btn_r2;
    mappedButtons.l2Value = v3PhysicalStates.btn_l2 ? 1.0 : 0.0;
    mappedButtons.r2Value = v3PhysicalStates.btn_r2 ? 1.0 : 0.0;
    mappedButtons.l3 = v3PhysicalStates.btn_l3;
    mappedButtons.r3 = v3PhysicalStates.btn_r3;
    mappedButtons.select = v3PhysicalStates.btn_select;
    mappedButtons.start = v3PhysicalStates.btn_start;
    mappedButtons.home = v3PhysicalStates.btn_home;
    mappedButtons.dpadUp = v3PhysicalStates.dpad_up;
    mappedButtons.dpadDown = v3PhysicalStates.dpad_down;
    mappedButtons.dpadLeft = v3PhysicalStates.dpad_left;
    mappedButtons.dpadRight = v3PhysicalStates.dpad_right;
  }

  // Stick Swap & Left stick to D-Pad support
  const finalLeftStick = stickRemap?.swapSticks ? rightStick : leftStick;
  const finalRightStick = stickRemap?.swapSticks ? leftStick : rightStick;

  if (stickRemap?.leftStickToDpad) {
    if (finalLeftStick.y > 0.5) mappedButtons.dpadUp = true;
    if (finalLeftStick.y < -0.5) mappedButtons.dpadDown = true;
    if (finalLeftStick.x < -0.5) mappedButtons.dpadLeft = true;
    if (finalLeftStick.x > 0.5) mappedButtons.dpadRight = true;
  }

  // Format hex string for telemetry
  const hex = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  return {
    ...currentState,
    buttons: mappedButtons,
    leftStick: finalLeftStick,
    rightStick: finalRightStick,
    rawHexPacket: hex,
    lastPacketTime: Date.now(),
    packetCounter: currentState.packetCounter + 1,
  };
}

/**
 * Builds authentic Sony DUALSHOCK 4 (DS4) USB Report (Report ID 0x01, 64-bytes)
 * Returns hex formatted string and raw byte array for inspection & bridge transmission
 */
export function buildDS4Report(state: GamepadState): { bytes: Uint8Array; hex: string } {
  const report = new Uint8Array(64);
  report[0] = 0x01; // Report ID for USB DS4

  // Stick axes: 0 to 255 (128 center)
  // Left Stick X
  report[1] = Math.round(((state.leftStick.x + 1) / 2) * 255);
  // Left Stick Y (0 is Top, 255 is Bottom in DS4 HID)
  report[2] = Math.round(((-state.leftStick.y + 1) / 2) * 255);
  // Right Stick X
  report[3] = Math.round(((state.rightStick.x + 1) / 2) * 255);
  // Right Stick Y
  report[4] = Math.round(((-state.rightStick.y + 1) / 2) * 255);

  // Byte 5: D-Pad Hat Switch (Bits 0-3) + Shape Buttons (Bits 4-7)
  // Hat Switch: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW, 8=Centered
  let dpadHat = 8;
  const { dpadUp, dpadRight, dpadDown, dpadLeft } = state.buttons;
  if (dpadUp && dpadRight) dpadHat = 1;
  else if (dpadDown && dpadRight) dpadHat = 3;
  else if (dpadDown && dpadLeft) dpadHat = 5;
  else if (dpadUp && dpadLeft) dpadHat = 7;
  else if (dpadUp) dpadHat = 0;
  else if (dpadRight) dpadHat = 2;
  else if (dpadDown) dpadHat = 4;
  else if (dpadLeft) dpadHat = 6;

  let byte5 = dpadHat & 0x0F;
  if (state.buttons.actionLeft) byte5 |= 0x10;  // Square
  if (state.buttons.actionDown) byte5 |= 0x20;  // Cross
  if (state.buttons.actionRight) byte5 |= 0x40; // Circle
  if (state.buttons.actionUp) byte5 |= 0x80;    // Triangle
  report[5] = byte5;

  // Byte 6: L1, R1, L2 (digital), R2 (digital), Share, Options, L3, R3
  let byte6 = 0;
  if (state.buttons.l1) byte6 |= 0x01;
  if (state.buttons.r1) byte6 |= 0x02;
  if (state.buttons.l2 || state.buttons.l2Value > 0.1) byte6 |= 0x04;
  if (state.buttons.r2 || state.buttons.r2Value > 0.1) byte6 |= 0x08;
  if (state.buttons.select) byte6 |= 0x10; // Share
  if (state.buttons.start) byte6 |= 0x20;  // Options
  if (state.buttons.l3) byte6 |= 0x40;
  if (state.buttons.r3) byte6 |= 0x80;
  report[6] = byte6;

  // Byte 7: PS Button (Bit 0), Touchpad Click (Bit 1), Counter (Bits 2-7)
  let byte7 = (state.packetCounter & 0x3F) << 2;
  if (state.buttons.home) byte7 |= 0x01;
  if (state.buttons.touchpadClick) byte7 |= 0x02;
  report[7] = byte7;

  // Byte 8 & 9: Analog Triggers (0-255)
  report[8] = Math.round((state.buttons.l2Value || (state.buttons.l2 ? 1 : 0)) * 255);
  report[9] = Math.round((state.buttons.r2Value || (state.buttons.r2 ? 1 : 0)) * 255);

  // Byte 13-18: IMU / Gyro & Accel (16-bit little endian)
  const gyroPitch = Math.round(state.gyro.pitch * 100);
  const gyroYaw = Math.round(state.gyro.yaw * 100);
  const gyroRoll = Math.round(state.gyro.roll * 100);

  report[13] = gyroPitch & 0xFF;
  report[14] = (gyroPitch >> 8) & 0xFF;
  report[15] = gyroYaw & 0xFF;
  report[16] = (gyroYaw >> 8) & 0xFF;
  report[17] = gyroRoll & 0xFF;
  report[18] = (gyroRoll >> 8) & 0xFF;

  // Battery Level in Byte 30
  report[30] = 0x1B; // 100% full, cable connected

  const hex = Array.from(report.slice(0, 32))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  return { bytes: report, hex };
}

/**
 * Builds authentic Nintendo Switch Pro Controller Subcommand 0x30 / 0x21 Full Report
 * Returns packed 12-bit stick axes and mapped buttons
 */
export function buildSwitchProReport(state: GamepadState): { bytes: Uint8Array; hex: string } {
  const report = new Uint8Array(49);
  report[0] = 0x30; // Standard Full Input Report
  report[1] = state.packetCounter & 0xFF; // Timer
  report[2] = 0x90; // Battery Full / Connection Status

  // Switch Button Mapping (Byte 3, 4, 5)
  // Byte 3: Right Joy-Con Buttons (Y, X, B, A, SR, SL, R, ZR)
  let byte3 = 0;
  // Nintendo Layout:
  // Action Down is 'B'
  // Action Right is 'A'
  // Action Left is 'Y'
  // Action Up is 'X'
  if (state.buttons.actionLeft) byte3 |= 0x01;  // Y
  if (state.buttons.actionUp) byte3 |= 0x02;    // X
  if (state.buttons.actionDown) byte3 |= 0x04;  // B
  if (state.buttons.actionRight) byte3 |= 0x08; // A
  if (state.buttons.r1) byte3 |= 0x40;          // R
  if (state.buttons.r2 || state.buttons.r2Value > 0.2) byte3 |= 0x80; // ZR
  report[3] = byte3;

  // Byte 4: Shared Buttons (Minus, Plus, RStick Click, LStick Click, Home, Capture)
  let byte4 = 0;
  if (state.buttons.select) byte4 |= 0x01; // Minus (-)
  if (state.buttons.start) byte4 |= 0x02;  // Plus (+)
  if (state.buttons.r3) byte4 |= 0x04;     // R Stick Click
  if (state.buttons.l3) byte4 |= 0x08;     // L Stick Click
  if (state.buttons.home) byte4 |= 0x10;   // Home
  if (state.buttons.touchpadClick) byte4 |= 0x20; // Capture
  report[4] = byte4;

  // Byte 5: Left Joy-Con Buttons (Down, Up, Right, Left, SR, SL, L, ZL)
  let byte5 = 0;
  if (state.buttons.dpadDown) byte5 |= 0x01;
  if (state.buttons.dpadUp) byte5 |= 0x02;
  if (state.buttons.dpadRight) byte5 |= 0x04;
  if (state.buttons.dpadLeft) byte5 |= 0x08;
  if (state.buttons.l1) byte5 |= 0x40; // L
  if (state.buttons.l2 || state.buttons.l2Value > 0.2) byte5 |= 0x80; // ZL
  report[5] = byte5;

  // Switch Pro Stick Axes are packed 12-bit values (0 - 4095, center 2048)
  // Left Stick: Bytes 6, 7, 8
  const lx = Math.round(((state.leftStick.x + 1) / 2) * 4095);
  const ly = Math.round(((state.leftStick.y + 1) / 2) * 4095); // Switch Y is up positive
  report[6] = lx & 0xFF;
  report[7] = ((lx >> 8) & 0x0F) | ((ly & 0x0F) << 4);
  report[8] = (ly >> 4) & 0xFF;

  // Right Stick: Bytes 9, 10, 11
  const rx = Math.round(((state.rightStick.x + 1) / 2) * 4095);
  const ry = Math.round(((state.rightStick.y + 1) / 2) * 4095);
  report[9] = rx & 0xFF;
  report[10] = ((rx >> 8) & 0x0F) | ((ry & 0x0F) << 4);
  report[11] = (ry >> 4) & 0xFF;

  // Byte 12: Vibrator Report
  report[12] = 0x00;

  // Byte 13 - 48: IMU 6-axis gyroscope and accelerometer data (3 samples x 12 bytes)
  const hex = Array.from(report.slice(0, 32))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  return { bytes: report, hex };
}

/**
 * Creates an empty initial GamepadState
 */
export function createInitialGamepadState(): GamepadState {
  return {
    buttons: {
      dpadUp: false,
      dpadDown: false,
      dpadLeft: false,
      dpadRight: false,
      actionDown: false,
      actionRight: false,
      actionLeft: false,
      actionUp: false,
      l1: false,
      r1: false,
      l2: false,
      r2: false,
      l2Value: 0,
      r2Value: 0,
      l3: false,
      r3: false,
      select: false,
      start: false,
      home: false,
      touchpadClick: false,
    },
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    gyro: {
      pitch: 0,
      roll: 0,
      yaw: 0,
      accelX: 0,
      accelY: 0,
      accelZ: 1.0,
    },
    ds4: {
      touchpad1: { active: false, x: 0, y: 0 },
      touchpad2: { active: false, x: 0, y: 0 },
      lightbarColor: '#3B82F6', // Blue
      batteryLevel: 95,
    },
    rawHexPacket: '01 80 80 80 80 08 00 00 00 00 00 00 00',
    lastPacketTime: Date.now(),
    packetCounter: 0,
  };
}

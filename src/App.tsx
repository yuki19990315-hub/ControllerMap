import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GamepadState,
  TargetControllerType,
  InputProtocolType,
  MappingProfile,
  ConnectedDevice,
  ScreenMappingNode,
} from './types/controller';
import { PRESET_PROFILES } from './utils/presets';
import {
  createInitialGamepadState,
  parseShootingPlusV3Packet,
  applyStickCurve,
} from './utils/packetParsers';
import { Navbar } from './components/Navbar';
import { ControllerVisualizer } from './components/ControllerVisualizer';
import { V3ButtonRemapper } from './components/V3ButtonRemapper';
import { ScreenMappingStudio } from './components/ScreenMappingStudio';
import { CalibrationTuning } from './components/CalibrationTuning';
import { PacketInspector } from './components/PacketInspector';
import { DeviceConnector } from './components/DeviceConnector';
import { ExportBridgeModal } from './components/ExportBridgeModal';
import { ProtocolGuideModal } from './components/ProtocolGuideModal';
import { AndroidPackageModal } from './components/AndroidPackageModal';
import {
  Gamepad2,
  Sliders,
  Terminal,
  Cpu,
  Keyboard,
  Compass,
  ArrowRight,
  Info,
  CheckCircle,
  Smartphone,
} from 'lucide-react';

export default function App() {
  const [targetController, setTargetController] = useState<TargetControllerType>('DS4');
  const [activeTab, setActiveTab] = useState<'visualizer' | 'remapper' | 'mapper' | 'calibration' | 'telemetry' | 'bridge'>('visualizer');
  const [currentProfile, setCurrentProfile] = useState<MappingProfile>(PRESET_PROFILES[0]);
  const [gamepadState, setGamepadState] = useState<GamepadState>(createInitialGamepadState());
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<InputProtocolType>('SHOOTING_PLUS_V3');

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);

  // Browser feature detection
  const isBLESupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const isHIDSupported = typeof navigator !== 'undefined' && 'hid' in navigator;

  // Active BLE device reference
  const bleDeviceRef = useRef<any>(null);
  const bleServerRef = useRef<any>(null);

  // Keyboard state tracking for smooth analog stick simulation
  const keysDownRef = useRef<{ [key: string]: boolean }>({});

  // Trigger manual button press
  const handleButtonPress = useCallback(
    (buttonKey: keyof GamepadState['buttons'], isPressed: boolean) => {
      setGamepadState(prev => {
        const nextButtons = { ...prev.buttons, [buttonKey]: isPressed };
        if (buttonKey === 'l2') nextButtons.l2Value = isPressed ? 1.0 : 0.0;
        if (buttonKey === 'r2') nextButtons.r2Value = isPressed ? 1.0 : 0.0;

        return {
          ...prev,
          buttons: nextButtons,
          packetCounter: prev.packetCounter + 1,
          lastPacketTime: Date.now(),
        };
      });
    },
    []
  );

  // Trigger stick movement
  const handleStickMove = useCallback(
    (stick: 'left' | 'right', x: number, y: number) => {
      setGamepadState(prev => {
        const calib = stick === 'left' ? currentProfile.leftStickCalibration : currentProfile.rightStickCalibration;
        const curved = applyStickCurve(x, y, calib);

        return {
          ...prev,
          [stick === 'left' ? 'leftStick' : 'rightStick']: curved,
          packetCounter: prev.packetCounter + 1,
          lastPacketTime: Date.now(),
        };
      });
    },
    [currentProfile]
  );

  // Simulate touch node action from ScreenMappingStudio
  const handleSimulateTouch = useCallback(
    (node: ScreenMappingNode, isDown: boolean) => {
      if (node.type === 'button' && node.targetButton) {
        handleButtonPress(node.targetButton as keyof GamepadState['buttons'], isDown);
        if (isDown) {
          setTimeout(() => {
            handleButtonPress(node.targetButton as keyof GamepadState['buttons'], false);
          }, 180);
        }
      } else if (node.type === 'joystick') {
        // Tap on joystick: brief forward movement
        handleStickMove('left', 0, isDown ? 1.0 : 0.0);
        if (isDown) {
          setTimeout(() => handleStickMove('left', 0, 0), 400);
        }
      } else if (node.type === 'camera_swipe') {
        // Tap on camera swipe: brief camera pan
        handleStickMove('right', isDown ? 0.8 : 0.0, 0);
        if (isDown) {
          setTimeout(() => handleStickMove('right', 0, 0), 400);
        }
      }
    },
    [handleButtonPress, handleStickMove]
  );

  // Inject raw BLE packet directly (for testing packet parser)
  const handleInjectRawPacket = useCallback(
    (bytes: number[]) => {
      setGamepadState(prev => {
        return parseShootingPlusV3Packet(
          bytes,
          prev,
          currentProfile.leftStickCalibration,
          currentProfile.rightStickCalibration,
          currentProfile.v3RemapTable,
          currentProfile.v3StickRemap
        );
      });
    },
    [currentProfile]
  );

  // Update Gyro Sensor Tilt
  const handleUpdateGyro = useCallback((pitch: number, roll: number, yaw: number) => {
    setGamepadState(prev => ({
      ...prev,
      gyro: {
        ...prev.gyro,
        pitch,
        roll,
        yaw,
      },
      packetCounter: prev.packetCounter + 1,
    }));
  }, []);

  // Web Bluetooth Scan & Connect
  const handleConnectBLE = async () => {
    if (!isBLESupported) {
      throw new Error('お使いのブラウザはWeb Bluetooth APIに対応していません (Chrome / Edge推奨)');
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // ShootingPlus V3 Service
          '0000fee0-0000-1000-8000-00805f9b34fb',
          'battery_service',
          'human_interface_device',
        ],
      });

      bleDeviceRef.current = device;
      const server = await device.gatt.connect();
      bleServerRef.current = server;

      // Try subscribing to ShootingPlus V3 or custom characteristic
      try {
        const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (e: any) => {
          const value = e.target.value;
          const bytes = new Uint8Array(value.buffer);
          handleInjectRawPacket(Array.from(bytes));
        });
      } catch (e) {
        console.warn('Standard ShootingPlus UUID not found, operating in generic BLE mode');
      }

      setConnectedDevices(prev => [
        ...prev.filter(d => d.id !== device.id),
        {
          id: device.id,
          name: device.name || 'Bluetooth コントローラー',
          type: 'ble',
          protocol: selectedProtocol,
          connected: true,
          battery: 88,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // WebHID Scan & Connect
  const handleConnectHID = async () => {
    if (!isHIDSupported) {
      throw new Error('お使いのブラウザはWebHID APIに対応していません');
    }

    try {
      const [device] = await (navigator as any).hid.requestDevice({ filters: [] });
      if (!device) return;

      await device.open();
      device.addEventListener('inputreport', (event: any) => {
        const { data } = event;
        const bytes = new Uint8Array(data.buffer);
        handleInjectRawPacket(Array.from(bytes));
      });

      setConnectedDevices(prev => [
        ...prev.filter(d => d.id !== String(device.productId)),
        {
          id: String(device.productId),
          name: device.productName || 'HID ゲームパッド',
          type: 'webhid',
          protocol: 'STANDARD_GAMEPAD',
          connected: true,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Disconnect Device
  const handleDisconnectDevice = (id: string) => {
    if (bleServerRef.current) {
      try {
        bleServerRef.current.disconnect();
      } catch (e) {}
    }
    setConnectedDevices(prev => prev.filter(d => d.id !== id));
  };

  // Add Virtual Controller
  const handleSimulateVirtualDevice = () => {
    const virtualId = `virt_${Date.now()}`;
    setConnectedDevices(prev => [
      ...prev.filter(d => d.type !== 'virtual'),
      {
        id: virtualId,
        name: '仮想キーボード・タッチ入力コントローラー',
        type: 'virtual',
        protocol: 'KEYBOARD_MOUSE',
        connected: true,
        battery: 100,
      },
    ]);
  };

  // Physical Gamepad API polling loop
  useEffect(() => {
    let animId: number;

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1];

      if (gp && gp.connected) {
        // Auto register to connected devices list if not yet present
        setConnectedDevices(prev => {
          if (!prev.some(d => d.id === gp.id)) {
            return [
              ...prev,
              {
                id: gp.id,
                name: gp.id.slice(0, 32),
                type: 'gamepad_api',
                protocol: 'STANDARD_GAMEPAD',
                connected: true,
              },
            ];
          }
          return prev;
        });

        // Map Gamepad API axes
        const rawLx = gp.axes[0] || 0;
        const rawLy = -(gp.axes[1] || 0);
        const rawRx = gp.axes[2] || 0;
        const rawRy = -(gp.axes[3] || 0);

        const leftCurved = applyStickCurve(rawLx, rawLy, currentProfile.leftStickCalibration);
        const rightCurved = applyStickCurve(rawRx, rawRy, currentProfile.rightStickCalibration);

        // Buttons
        setGamepadState(prev => ({
          ...prev,
          leftStick: leftCurved,
          rightStick: rightCurved,
          buttons: {
            ...prev.buttons,
            actionDown: gp.buttons[0]?.pressed || false,  // Cross / B
            actionRight: gp.buttons[1]?.pressed || false, // Circle / A
            actionLeft: gp.buttons[2]?.pressed || false,  // Square / Y
            actionUp: gp.buttons[3]?.pressed || false,    // Triangle / X
            l1: gp.buttons[4]?.pressed || false,
            r1: gp.buttons[5]?.pressed || false,
            l2: gp.buttons[6]?.pressed || false,
            r2: gp.buttons[7]?.pressed || false,
            l2Value: gp.buttons[6]?.value || 0,
            r2Value: gp.buttons[7]?.value || 0,
            select: gp.buttons[8]?.pressed || false,
            start: gp.buttons[9]?.pressed || false,
            l3: gp.buttons[10]?.pressed || false,
            r3: gp.buttons[11]?.pressed || false,
            dpadUp: gp.buttons[12]?.pressed || false,
            dpadDown: gp.buttons[13]?.pressed || false,
            dpadLeft: gp.buttons[14]?.pressed || false,
            dpadRight: gp.buttons[15]?.pressed || false,
            home: gp.buttons[16]?.pressed || false,
          },
          packetCounter: prev.packetCounter + 1,
        }));
      }

      animId = requestAnimationFrame(pollGamepads);
    };

    animId = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(animId);
  }, [currentProfile]);

  // Keyboard controls listener (WASD = Move, Arrow keys = Camera, J/K/U/I = Buttons)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      keysDownRef.current[e.code] = true;

      // Button mappings
      if (e.code === 'KeyJ') handleButtonPress('actionDown', true);  // Cross / B
      if (e.code === 'KeyK') handleButtonPress('actionRight', true); // Circle / A
      if (e.code === 'KeyU') handleButtonPress('actionLeft', true);  // Square / Y
      if (e.code === 'KeyI') handleButtonPress('actionUp', true);    // Triangle / X
      if (e.code === 'KeyQ') handleButtonPress('l1', true);
      if (e.code === 'KeyE') handleButtonPress('r1', true);
      if (e.code === 'KeyZ') handleButtonPress('l2', true);
      if (e.code === 'KeyC') handleButtonPress('r2', true);
      if (e.code === 'Space') {
        e.preventDefault();
        handleButtonPress('actionDown', true);
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        handleButtonPress('select', true);
      }
      if (e.code === 'Enter') handleButtonPress('start', true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      keysDownRef.current[e.code] = false;

      if (e.code === 'KeyJ') handleButtonPress('actionDown', false);
      if (e.code === 'KeyK') handleButtonPress('actionRight', false);
      if (e.code === 'KeyU') handleButtonPress('actionLeft', false);
      if (e.code === 'KeyI') handleButtonPress('actionUp', false);
      if (e.code === 'KeyQ') handleButtonPress('l1', false);
      if (e.code === 'KeyE') handleButtonPress('r1', false);
      if (e.code === 'KeyZ') handleButtonPress('l2', false);
      if (e.code === 'KeyC') handleButtonPress('r2', false);
      if (e.code === 'Space') handleButtonPress('actionDown', false);
      if (e.code === 'Tab') handleButtonPress('select', false);
      if (e.code === 'Enter') handleButtonPress('start', false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Continuous Stick polling from keyboard
    const interval = setInterval(() => {
      const keys = keysDownRef.current;
      let lx = 0;
      let ly = 0;
      let rx = 0;
      let ry = 0;

      if (keys['KeyW']) ly += 1;
      if (keys['KeyS']) ly -= 1;
      if (keys['KeyA']) lx -= 1;
      if (keys['KeyD']) lx += 1;

      if (keys['ArrowUp']) ry += 1;
      if (keys['ArrowDown']) ry -= 1;
      if (keys['ArrowLeft']) rx -= 1;
      if (keys['ArrowRight']) rx += 1;

      if (lx !== 0 || ly !== 0) {
        handleStickMove('left', lx, ly);
      } else if (gamepadState.leftStick.x !== 0 || gamepadState.leftStick.y !== 0) {
        // Return to center if no physical gamepad is active
        handleStickMove('left', 0, 0);
      }

      if (rx !== 0 || ry !== 0) {
        handleStickMove('right', rx, ry);
      } else if (gamepadState.rightStick.x !== 0 || gamepadState.rightStick.y !== 0) {
        handleStickMove('right', 0, 0);
      }
    }, 20);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [handleButtonPress, handleStickMove, gamepadState.leftStick, gamepadState.rightStick]);

  // Mobile Device Orientation (Gyro tilt)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        // Beta is pitch (-180 to 180), Gamma is roll (-90 to 90)
        const pitch = Math.max(-45, Math.min(45, e.beta - 45)); // assume holding at 45 degree angle
        const roll = Math.max(-45, Math.min(45, e.gamma));
        const yaw = e.alpha ? e.alpha % 360 : 0;

        handleUpdateGyro(pitch, roll, yaw);

        // If mapToRightStick is enabled, tilt drives right stick!
        if (currentProfile.gyroCalibration.enabled && currentProfile.gyroCalibration.mapToRightStick) {
          const rx = (roll / 30) * currentProfile.gyroCalibration.sensitivity;
          const ry = (-pitch / 30) * currentProfile.gyroCalibration.sensitivity;
          handleStickMove('right', Math.max(-1, Math.min(1, rx)), Math.max(-1, Math.min(1, ry)));
        }
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [currentProfile.gyroCalibration, handleUpdateGyro, handleStickMove]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetController={targetController}
        setTargetController={setTargetController}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAndroidPackage={() => setIsAndroidModalOpen(true)}
        connectedDeviceCount={connectedDevices.length}
      />

      {/* 2. Main Content Workspace Container (1440px wide baseline) */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Device Connector Ribbon */}
        <DeviceConnector
          connectedDevices={connectedDevices}
          onConnectBLE={handleConnectBLE}
          onConnectHID={handleConnectHID}
          onDisconnectDevice={handleDisconnectDevice}
          selectedProtocol={selectedProtocol}
          setSelectedProtocol={setSelectedProtocol}
          isBLESupported={isBLESupported}
          isHIDSupported={isHIDSupported}
          onSimulateVirtualDevice={handleSimulateVirtualDevice}
        />

        {/* Dynamic Tab Views */}
        {activeTab === 'visualizer' && (
          <div className="space-y-6">
            <ControllerVisualizer
              state={gamepadState}
              targetController={targetController}
              onButtonPress={handleButtonPress}
              onStickMove={handleStickMove}
            />

            {/* Quick-Action Android APK Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    AndroidスマートフォンにAPKまたはPWAとして導入
                  </h3>
                  <p className="text-xs text-neutral-300">
                    PWABuilderで30秒で署名済みAPK（.apk）を自動生成、またはChromeから1タップで野良アプリ警告なしにホーム画面アプリ化できます。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAndroidModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all whitespace-nowrap shrink-0"
              >
                <span>APK化・導入手順</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick-Action V3 Button Remapping Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    ShootingPlus V3 のボタンを自由に割り当てる
                  </h3>
                  <p className="text-xs text-neutral-400">
                    V3のA/B/X/Y/L1/R1/L2/R2等の各ボタンを{targetController === 'DS4' ? 'DUALSHOCK 4 (✕/○/□/△)' : 'Switch Pro (B/A/Y/X)'}の好きなボタンに1対1で自由変更できます。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('remapper')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all whitespace-nowrap shrink-0"
              >
                <span>V3ボタン割り当てを開く</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick-Action Bridge Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    実機ゲーム（PC/PS4/Switch本体）で今すぐ使いたい場合
                  </h3>
                  <p className="text-xs text-neutral-400">
                    ViGEm PCブリッジ（Windows仮想ドライバ）またはESP32ドングル（USB HID）を使って、OSに本物のコントローラーとしてパススルーできます。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-all whitespace-nowrap shrink-0"
              >
                <span>連携コードを開く</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'remapper' && (
          <V3ButtonRemapper
            profile={currentProfile}
            setProfile={setCurrentProfile}
            targetController={targetController}
            gamepadState={gamepadState}
          />
        )}

        {activeTab === 'mapper' && (
          <ScreenMappingStudio
            currentProfile={currentProfile}
            setProfile={setCurrentProfile}
            targetController={targetController}
            gamepadState={gamepadState}
            onSimulateTouch={handleSimulateTouch}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationTuning
            profile={currentProfile}
            setProfile={setCurrentProfile}
            gamepadState={gamepadState}
            onUpdateGyro={handleUpdateGyro}
          />
        )}

        {activeTab === 'telemetry' && (
          <PacketInspector
            gamepadState={gamepadState}
            targetController={targetController}
            onInjectRawPacket={handleInjectRawPacket}
          />
        )}

        {activeTab === 'bridge' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-6 backdrop-blur">
            <div>
              <h2 className="text-base font-bold text-white">PC & ハードウェア実機ブリッジ連携</h2>
              <p className="text-xs text-neutral-400 mt-1">
                スマホ画面マッピング式コントローラーを、Windows OS / Nintendo Switch / PS4実機で動作させる2大ソリューション
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Windows ViGEm PC Bridge */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-700/50 text-indigo-400">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      方法1: Windows PC 仮想コントローラー (ViGEm)
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-medium">無料 · 追加機材不要 · 遅延0ms</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Windowsの標準仮想ゲームパッドドライバ「ViGEmBus」を使用。
                  Pythonスクリプトを実行するだけで、デバイスマネージャーに本物の
                  <strong className="text-white">「Sony Interactive Entertainment DUALSHOCK 4」</strong>
                  または<strong className="text-white">「Nintendo Switch Pro Controller」</strong>が生成されます。
                  Steam、PS Remote Play、原神PC版、エミュレーター全てで即座に動作します。
                </p>

                <div className="rounded bg-neutral-900 p-3 font-mono text-[11px] text-neutral-300 space-y-1">
                  <div className="text-neutral-500"># 依存ライブラリのインストール</div>
                  <div>pip install vgamepad websockets</div>
                  <div className="text-neutral-500 pt-1"># ブリッジ起動</div>
                  <div>python crosspad_bridge_{targetController.toLowerCase()}.py</div>
                </div>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Pythonスクリプトをダウンロード
                </button>
              </div>

              {/* Option 2: ESP32 Hardware Dongle */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-950/70 border border-blue-700/50 text-blue-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      方法2: ESP32 マイコン USBドングル (C++)
                    </h3>
                    <span className="text-[11px] text-blue-400 font-medium">PC不要 · Switch実機/PS4本体に直挿し可能</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  ESP32-S3またはESP32マイコン（約500円〜800円）をハードウェア中継器にします。
                  ESP32がスマホコントローラーとBluetoothペアリングし、Nintendo SwitchのドックやPS4のUSBポートに挿すだけで本物の有線コントローラーとして認識されます。
                </p>

                <div className="rounded bg-neutral-900 p-3 text-[11px] text-neutral-300 space-y-1 font-mono">
                  <div>[スマホコントローラー] (BLE)</div>
                  <div className="text-indigo-400 pl-4">↓ Bluetooth GATT受信</div>
                  <div>[ESP32-S3 マイコン]</div>
                  <div className="text-indigo-400 pl-4">↓ USB HID ({targetController})</div>
                  <div>[Switch本体 / PS4 / PC]</div>
                </div>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors"
                >
                  ESP32 Arduinoコードをダウンロード
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Cheatsheet Card (Bottom Drawer) */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 text-xs text-neutral-400">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-neutral-300 font-semibold">
              <Keyboard className="h-4 w-4 text-indigo-400" />
              <span>即時テスト用 キーボードショートカット</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">W/A/S/D</kbd> Lスティック移動</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">矢印キー</kbd> Rスティック視点</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">J</kbd> ✕ / B</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">K</kbd> ○ / A</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">U</kbd> □ / Y</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">I</kbd> △ / X</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">Q / E</kbd> L1 / R1</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200">Z / C</kbd> L2 / R2</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-800/80 py-4 text-center text-xs text-neutral-500 font-sans">
        CrossPad Protocol · スマホ画面マッピング式Bluetoothコントローラー変換スタジオ
      </footer>

      {/* Modals */}
      <ExportBridgeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        profile={currentProfile}
        targetController={targetController}
      />

      <ProtocolGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <AndroidPackageModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        appUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
}

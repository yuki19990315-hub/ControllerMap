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
import { isNativeAndroid, nativeController } from './utils/nativeController';
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
  const [nativePacketInfo, setNativePacketInfo] = useState<{ count: number; size: number; characteristic: string; hex: string } | null>(null);
  const nativePacketCountRef = useRef(0);

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

  // Native Android BLE bridge: diagnose incoming raw data and use the existing V3
  // parser only for 16-byte frames. Other formats remain unverified, not guessed.
  useEffect(() => {
    if (!isNativeAndroid) return;
    let disposed = false;
    const handles: Array<{ remove(): Promise<void> }> = [];
    Promise.all([
      nativeController.addListener('packet', packet => {
        const bytes = packet.bytes;
        if (!Array.isArray(bytes)) return;
        const count = ++nativePacketCountRef.current;
        if (count === 1 || count % 12 === 0) {
          setNativePacketInfo({
            count,
            size: bytes.length,
            characteristic: packet.characteristic,
            hex: bytes.slice(0, 32).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
          });
        }
        if (selectedProtocol === 'SHOOTING_PLUS_V3' && bytes.length === 16) {
          handleInjectRawPacket(bytes);
        }
      }),
      nativeController.addListener('status', event => {
        if (!event.address) return;
        const deviceId = 'native_ble_' + event.address;
        if (event.status === 'connected' || event.status === 'notifications_ready' || event.status === 'no_notifications') {
          setConnectedDevices(prev => [
            ...prev.filter(d => d.id !== deviceId && !d.id.startsWith('native_ble_')),
            {
              id: deviceId,
              name: event.name || 'Android BLEコントローラー',
              type: 'ble',
              protocol: selectedProtocol,
              connected: true,
            },
          ]);
        } else if (event.status === 'disconnected' || event.status === 'error') {
          setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
        }
      }),
    ]).then(registered => {
      if (disposed) registered.forEach(handle => void handle.remove());
      else handles.push(...registered);
    }).catch(error => console.warn('Native controller listener registration failed:', error));
    return () => {
      disposed = true;
      handles.forEach(handle => void handle.remove());
    };
  }, [handleInjectRawPacket, selectedProtocol]);

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
    if (id.startsWith('native_ble_') && isNativeAndroid) {
      void nativeController.disconnect().catch(error => console.warn('Native BLE disconnect failed:', error));
    }
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

  const sectionInfo = {
    visualizer: { eyebrow: 'LIVE CONTROLLER', title: '変換モニター', description: 'コントローラーの入力状態をリアルタイムで確認' },
    remapper: { eyebrow: 'BUTTON CONFIG', title: 'ボタン割り当て', description: '物理ボタンを好きな操作に割り当て' },
    mapper: { eyebrow: 'TOUCH MAPPING', title: '画面マッピング', description: '画面上の操作位置を編集' },
    calibration: { eyebrow: 'PRECISION CONTROL', title: '感度・ジャイロ調整', description: 'スティックやセンサーの動作を調整' },
    telemetry: { eyebrow: 'PACKET INSPECTOR', title: '通信解析', description: '受信した入力データを確認' },
    bridge: { eyebrow: 'HARDWARE BRIDGE', title: 'PC・ESP32連携', description: '外部機器との接続方法やコード出力' },
  }[activeTab];

  return (
    <div className="crosspad-app min-h-screen min-w-0 bg-[#080e18] text-slate-100 flex flex-col font-sans">
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
      <main className="crosspad-workspace relative z-0 mx-auto w-full max-w-7xl min-w-0 flex-1 space-y-4 px-3 pb-28 pt-5 sm:space-y-5 sm:px-6 md:pb-8 lg:px-8">
        <div className="flex min-w-0 items-end justify-between gap-3 px-1 pb-1">
          <div className="min-w-0">
            <p className="mb-1 font-mono text-[10px] font-bold tracking-[0.2em] text-cyan-400/85">{sectionInfo.eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{sectionInfo.title}</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">{sectionInfo.description}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-300 sm:flex">
            <span className={connectedDevices.length ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-amber-400'} />
            {connectedDevices.length ? connectedDevices.length + '台接続中' : '入力待機中'}
          </div>
        </div>
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

        {isNativeAndroid && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-100">
            <p className="font-bold">Android ネイティブBLE診断モード</p>
            <p className="mt-1 text-amber-100/75">
              V3の検出・接続と入力確認を行います。rootなしで別アプリにDUALSHOCK 4として認識させる機能はありません。
            </p>
            {nativePacketInfo && (
              <div className="mt-2 space-y-1 rounded-lg bg-black/20 p-2 font-mono text-[11px] text-cyan-200">
                <div>受信: {nativePacketInfo.count}件 / 直近 {nativePacketInfo.size} bytes</div>
                <div className="break-all">特性: {nativePacketInfo.characteristic}</div>
                <div className="break-all">HEX: {nativePacketInfo.hex}</div>
                {nativePacketInfo.size !== 16 && <div className="font-sans text-amber-200">16バイト形式と異なるため、ボタン解析は保留中です。</div>}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Tab Views */}
        {activeTab === 'visualizer' && (
          <div className="space-y-6">
            <ControllerVisualizer
              state={gamepadState}
              targetController={targetController}
              onButtonPress={handleButtonPress}
              onStickMove={handleStickMove}
            />

            {/* Touch-friendly quick actions, secondary to the live controller. */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <button type="button" onClick={() => setActiveTab('remapper')} className="group flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-4 text-left transition hover:bg-cyan-400/15">
                <Gamepad2 className="h-5 w-5 text-cyan-300" />
                <span className="flex w-full items-end justify-between gap-1 text-sm font-bold text-white">ボタン割り当て <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300 transition group-hover:translate-x-1" /></span>
              </button>
              <button type="button" onClick={() => setActiveTab('mapper')} className="group flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-4 text-left transition hover:bg-violet-400/15">
                <Smartphone className="h-5 w-5 text-violet-300" />
                <span className="flex w-full items-end justify-between gap-1 text-sm font-bold text-white">画面マッピング <ArrowRight className="h-4 w-4 shrink-0 text-violet-300 transition group-hover:translate-x-1" /></span>
              </button>
              <button type="button" onClick={() => setIsAndroidModalOpen(true)} className="group flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-left transition hover:bg-emerald-400/15">
                <Smartphone className="h-5 w-5 text-emerald-300" />
                <span className="flex w-full items-end justify-between gap-1 text-sm font-bold text-white">スマホに導入 <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300 transition group-hover:translate-x-1" /></span>
              </button>
              <button type="button" onClick={() => setIsExportModalOpen(true)} className="group flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-blue-400/20 bg-blue-400/[0.07] p-4 text-left transition hover:bg-blue-400/15">
                <Cpu className="h-5 w-5 text-blue-300" />
                <span className="flex w-full items-end justify-between gap-1 text-sm font-bold text-white">連携コード出力 <ArrowRight className="h-4 w-4 shrink-0 text-blue-300 transition group-hover:translate-x-1" /></span>
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
        <div className="hidden rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 text-xs text-neutral-400 md:block">
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
      <footer className="hidden w-full border-t border-neutral-800/80 py-4 text-center text-xs text-neutral-500 font-sans md:block">
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

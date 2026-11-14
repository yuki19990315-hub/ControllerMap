import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export const isNativeAndroid = Capacitor.getPlatform() === 'android';

export interface NativeBleDevice {
  address: string;
  name: string;
  rssi: number;
}

export interface NativePacket {
  address: string;
  characteristic: string;
  bytes: number[];
}

export interface NativeConnectionStatus {
  status: 'scanning' | 'scan_complete' | 'connecting' | 'connected' | 'notifications_ready' | 'no_notifications' | 'disconnected' | 'error';
  address: string;
  name: string;
  characteristic: string;
  detail: string;
}

export interface SystemGamepad {
  id: number;
  name: string;
  vendorId: number;
  productId: number;
  sources: number;
}

export interface NativeController {
  capabilities(): Promise<{
    nativeBle: boolean;
    bluetoothEnabled: boolean;
    canImpersonateDs4ForLocalGames: boolean;
    message: string;
  }>;
  systemGamepads(): Promise<{ devices: SystemGamepad[] }>;
  scan(): Promise<void>;
  stopScan(): Promise<void>;
  connect(options: { address: string; name: string }): Promise<void>;
  disconnect(): Promise<void>;
  addListener(eventName: 'deviceFound', listener: (device: NativeBleDevice) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'packet', listener: (packet: NativePacket) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'status', listener: (status: NativeConnectionStatus) => void): Promise<PluginListenerHandle>;
}

export const nativeController = registerPlugin<NativeController>('ControllerNative');

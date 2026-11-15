import { registerPlugin } from '@capacitor/core';

export interface UinputStatus {
  shizukuRunning: boolean;
  authorized: boolean;
  uid: number;
  virtualPadActive: boolean;
  joyConActive?: boolean;
  mode: 'experimental-uinput';
}

export interface JoyConMergeStatus {
  active: boolean;
  supported?: boolean;
  leftConnected?: boolean;
  rightConnected?: boolean;
  uinputWritable?: boolean;
  leftName?: string;
  rightName?: string;
  reports?: number;
  message: string;
}

export interface UinputBridge {
  status(): Promise<UinputStatus>;
  authorize(): Promise<void>;
  start(): Promise<{ active: boolean; probe: string }>;
  submit(options: { state: string }): Promise<void>;
  stop(): Promise<void>;
  joyConProbe(): Promise<{ status: JoyConMergeStatus }>;
  joyConStart(): Promise<{ status: JoyConMergeStatus }>;
  joyConStatus(): Promise<{ status: JoyConMergeStatus }>;
  joyConStop(): Promise<{ status: JoyConMergeStatus }>;
}

/**
 * Uses Shizuku (ADB shell) to ask Android's uinput tool to create a virtual pad.
 * The virtual device is experimental, not a full DualShock HID implementation.
 */
export const uinputBridge = registerPlugin<UinputBridge>('GamepadUinput');

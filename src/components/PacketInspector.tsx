import React, { useState } from 'react';
import { GamepadState, TargetControllerType } from '../types/controller';
import { buildDS4Report, buildSwitchProReport } from '../utils/packetParsers';
import { Terminal, Cpu, ArrowRight, Play, RefreshCw, FileText } from 'lucide-react';

interface PacketInspectorProps {
  gamepadState: GamepadState;
  targetController: TargetControllerType;
  onInjectRawPacket: (bytes: number[]) => void;
}

export const PacketInspector: React.FC<PacketInspectorProps> = ({
  gamepadState,
  targetController,
  onInjectRawPacket,
}) => {
  const isDS4 = targetController === 'DS4';
  const ds4Report = buildDS4Report(gamepadState);
  const switchReport = buildSwitchProReport(gamepadState);

  // Raw input packet breakdown (ShootingPlus V3 16-byte protocol standard)
  const rawBytes = gamepadState.rawHexPacket
    ? gamepadState.rawHexPacket.split(' ').map(hex => parseInt(hex, 16) || 0)
    : [0x55, 0xAA, 0x01, 0x10, 0x80, 0x80, 0x80, 0x80, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00];

  const translatedBytes = isDS4 ? Array.from(ds4Report.bytes) : Array.from(switchReport.bytes);

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
          <div>
            <span className="text-sm font-semibold text-white">
              Bluetooth LE 入力パケット ⇄ {isDS4 ? 'DUALSHOCK 4 HID' : 'Switch Pro Report'} リアルタイム変換
            </span>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span>ShootingPlus V3 / Flydigi GATT通知プロトコル</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">100Hz〜250Hz レート</span>
            </div>
          </div>

          {/* Quick Packet Injection Presets */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => {
                // Shoot button pressed (A bitmask)
                const b = [...rawBytes];
                b[8] = 0x01; // Button A
                onInjectRawPacket(b);
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors"
            >
              A/✕ 押下パケット
            </button>
            <button
              onClick={() => {
                // Left Stick Full Right
                const b = [...rawBytes];
                b[4] = 0xFF; // LX 255
                b[5] = 0x80; // LY 128
                onInjectRawPacket(b);
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors"
            >
              Lスティック右最大
            </button>
            <button
              onClick={() => {
                // Center / Release all
                const b = [0x55, 0xAA, 0x01, 0x10, 0x80, 0x80, 0x80, 0x80, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00];
                onInjectRawPacket(b);
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors"
            >
              ニュートラルリセット
            </button>
          </div>
        </div>

        {/* Packet Flow Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Input Packet (Phone Controller) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                スマホコントローラー BLE 受信パケット (ShootingPlus V3)
              </span>
              <span className="font-mono text-neutral-500 text-[11px]">16 Bytes</span>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 text-center">
                {rawBytes.slice(0, 16).map((byte, idx) => {
                  const hex = byte.toString(16).padStart(2, '0').toUpperCase();
                  const isStick = idx >= 4 && idx <= 7;
                  const isBtn = idx === 8 || idx === 9;
                  const isDpad = idx === 10;

                  return (
                    <div
                      key={idx}
                      className={`p-1 rounded ${
                        isStick
                          ? 'bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-bold'
                          : isBtn
                          ? 'bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 font-bold'
                          : isDpad
                          ? 'bg-amber-950/70 border border-amber-700/50 text-amber-300 font-bold'
                          : 'text-neutral-400'
                      }`}
                      title={`Byte ${idx}: 0x${hex} (${byte})`}
                    >
                      <div className="text-[9px] text-neutral-500 font-sans">B{idx}</div>
                      <div>{hex}</div>
                    </div>
                  );
                })}
              </div>

              {/* Byte mapping legend */}
              <div className="mt-3 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 space-y-1 font-sans">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-900 border border-indigo-600" />
                  <span>
                    B4〜B7: アナログスティック軸 (LX: 0x{rawBytes[4]?.toString(16).toUpperCase() || '80'}, LY: 0x{rawBytes[5]?.toString(16).toUpperCase() || '80'}, RX: 0x{rawBytes[6]?.toString(16).toUpperCase() || '80'}, RY: 0x{rawBytes[7]?.toString(16).toUpperCase() || '80'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-900 border border-emerald-600" />
                  <span>B8〜B9: ボタンビットマスク (A/B/X/Y/L1/R1/L2/R2/Select/Start)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-900 border border-amber-600" />
                  <span>B10: D-Pad ハットスイッチ (0=上, 2=右, 4=下, 6=左, 8=ニュートラル)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Output Packet (Converted DUALSHOCK or Switch) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isDS4 ? 'bg-blue-500' : 'bg-red-500'}`} />
                生成された {isDS4 ? 'DUALSHOCK 4 (USB HID)' : 'Nintendo Switch Pro'} レポート
              </span>
              <span className="font-mono text-neutral-500 text-[11px]">
                {isDS4 ? '64 Bytes' : '49 Bytes'}
              </span>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 text-center max-h-48 overflow-y-auto">
                {translatedBytes.slice(0, 32).map((byte, idx) => {
                  const hex = byte.toString(16).padStart(2, '0').toUpperCase();
                  const isHeader = idx === 0;
                  const isSticks = isDS4 ? idx >= 1 && idx <= 4 : idx >= 6 && idx <= 11;
                  const isBtns = isDS4 ? idx >= 5 && idx <= 7 : idx >= 3 && idx <= 5;
                  const isTriggers = isDS4 && (idx === 8 || idx === 9);

                  return (
                    <div
                      key={idx}
                      className={`p-1 rounded ${
                        isHeader
                          ? 'bg-neutral-800 text-white font-bold'
                          : isSticks
                          ? 'bg-blue-950/70 border border-blue-700/50 text-blue-300 font-bold'
                          : isBtns
                          ? 'bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 font-bold'
                          : isTriggers
                          ? 'bg-rose-950/70 border border-rose-700/50 text-rose-300 font-bold'
                          : 'text-neutral-500'
                      }`}
                      title={`Report Byte ${idx}: 0x${hex}`}
                    >
                      <div className="text-[9px] text-neutral-500 font-sans">#{idx}</div>
                      <div>{hex}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-sans">
                {isDS4 ? (
                  <span>
                    #0: Report ID (0x01) · #1-#4: スティック軸 · #5: △○✕□ & ハット · #6: L1/R1/L2/R2/Options · #8-#9: アナログトリガー圧
                  </span>
                ) : (
                  <span>
                    #0: 0x30 (標準入力レポート) · #1: タイマー · #3-#5: Switchボタン · #6-#11: 12bitパックスティック軸
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

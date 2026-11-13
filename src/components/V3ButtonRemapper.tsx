import React, { useState, useEffect } from 'react';
import {
  GamepadState,
  MappingProfile,
  TargetControllerType,
  TargetGamepadButtonKey,
  V3ButtonRemapTable,
  V3PhysicalButton,
} from '../types/controller';
import { DEFAULT_V3_REMAP_TABLE } from '../utils/presets';
import {
  Gamepad2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Radio,
  Sliders,
  Check,
  Zap,
  HelpCircle,
} from 'lucide-react';

interface V3ButtonRemapperProps {
  profile: MappingProfile;
  setProfile: (profile: MappingProfile) => void;
  targetController: TargetControllerType;
  gamepadState: GamepadState;
}

interface V3ButtonItem {
  key: V3PhysicalButton;
  name: string;
  category: 'face' | 'shoulder' | 'dpad' | 'thumb' | 'menu';
  defaultLabel: string;
}

const V3_BUTTONS: V3ButtonItem[] = [
  // Face Buttons
  { key: 'btn_a', name: 'V3 A ボタン', category: 'face', defaultLabel: 'A (通常: 下ボタン)' },
  { key: 'btn_b', name: 'V3 B ボタン', category: 'face', defaultLabel: 'B (通常: 右ボタン)' },
  { key: 'btn_x', name: 'V3 X ボタン', category: 'face', defaultLabel: 'X (通常: 左ボタン)' },
  { key: 'btn_y', name: 'V3 Y ボタン', category: 'face', defaultLabel: 'Y (通常: 上ボタン)' },

  // Shoulder & Trigger
  { key: 'btn_l1', name: 'V3 L1 バンパー', category: 'shoulder', defaultLabel: 'L1 (左上ボタン)' },
  { key: 'btn_r1', name: 'V3 R1 バンパー', category: 'shoulder', defaultLabel: 'R1 (右上ボタン)' },
  { key: 'btn_l2', name: 'V3 L2 トリガー', category: 'shoulder', defaultLabel: 'L2 (左下トリガー)' },
  { key: 'btn_r2', name: 'V3 R2 トリガー', category: 'shoulder', defaultLabel: 'R2 (右下トリガー)' },

  // Thumbstick Clicks
  { key: 'btn_l3', name: 'V3 L3 押し込み', category: 'thumb', defaultLabel: '左スティック押し込み' },
  { key: 'btn_r3', name: 'V3 R3 押し込み', category: 'thumb', defaultLabel: '右スティック押し込み' },

  // D-Pad
  { key: 'dpad_up', name: 'V3 十字キー ↑', category: 'dpad', defaultLabel: '十字キー 上' },
  { key: 'dpad_down', name: 'V3 十字キー ↓', category: 'dpad', defaultLabel: '十字キー 下' },
  { key: 'dpad_left', name: 'V3 十字キー ←', category: 'dpad', defaultLabel: '十字キー 左' },
  { key: 'dpad_right', name: 'V3 十字キー →', category: 'dpad', defaultLabel: '十字キー 右' },

  // System & Menu
  { key: 'btn_select', name: 'V3 Select / Back', category: 'menu', defaultLabel: 'Select / バック' },
  { key: 'btn_start', name: 'V3 Start', category: 'menu', defaultLabel: 'Start / メニュー' },
  { key: 'btn_home', name: 'V3 Home', category: 'menu', defaultLabel: 'Home ボタン' },
];

export const V3ButtonRemapper: React.FC<V3ButtonRemapperProps> = ({
  profile,
  setProfile,
  targetController,
  gamepadState,
}) => {
  const isDS4 = targetController === 'DS4';
  const remapTable = profile.v3RemapTable || { ...DEFAULT_V3_REMAP_TABLE };
  const stickRemap = profile.v3StickRemap || { swapSticks: false, leftStickToDpad: false };

  const [listenModeKey, setListenModeKey] = useState<V3PhysicalButton | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'face' | 'shoulder' | 'dpad' | 'thumb'>('all');
  const [lastDetectedKey, setLastDetectedKey] = useState<V3PhysicalButton | null>(null);

  // Target Button Option Definitions
  const targetOptions: Array<{ key: TargetGamepadButtonKey; label: string; badgeColor: string }> = isDS4
    ? [
        { key: 'actionDown', label: '✕ (Cross / 決定・ジャンプ)', badgeColor: 'text-blue-400' },
        { key: 'actionRight', label: '○ (Circle / 回避・キャンセル)', badgeColor: 'text-rose-400' },
        { key: 'actionLeft', label: '□ (Square / 攻撃・リロード)', badgeColor: 'text-pink-400' },
        { key: 'actionUp', label: '△ (Triangle / 武器切替・スキル)', badgeColor: 'text-emerald-400' },
        { key: 'l1', label: 'L1 (左バンパー)', badgeColor: 'text-neutral-200' },
        { key: 'r1', label: 'R1 (右バンパー)', badgeColor: 'text-neutral-200' },
        { key: 'l2', label: 'L2 (左トリガー・ADS照準)', badgeColor: 'text-indigo-400' },
        { key: 'r2', label: 'R2 (右トリガー・射撃/攻撃)', badgeColor: 'text-indigo-400' },
        { key: 'l3', label: 'L3 (左スティック押し込み)', badgeColor: 'text-neutral-300' },
        { key: 'r3', label: 'R3 (右スティック押し込み)', badgeColor: 'text-neutral-300' },
        { key: 'dpadUp', label: '方向キー ↑', badgeColor: 'text-neutral-300' },
        { key: 'dpadDown', label: '方向キー ↓', badgeColor: 'text-neutral-300' },
        { key: 'dpadLeft', label: '方向キー ←', badgeColor: 'text-neutral-300' },
        { key: 'dpadRight', label: '方向キー →', badgeColor: 'text-neutral-300' },
        { key: 'select', label: 'SHARE (共有/マップ)', badgeColor: 'text-neutral-400' },
        { key: 'start', label: 'OPTIONS (メニュー)', badgeColor: 'text-neutral-400' },
        { key: 'home', label: 'PS ボタン', badgeColor: 'text-blue-400' },
        { key: 'touchpadClick', label: 'タッチパッド押し込み', badgeColor: 'text-neutral-300' },
        { key: 'none', label: '未割り当て (無効)', badgeColor: 'text-neutral-500' },
      ]
    : [
        { key: 'actionRight', label: 'A (Nintendo 決定)', badgeColor: 'text-red-400' },
        { key: 'actionDown', label: 'B (Nintendo キャンセル/ジャンプ)', badgeColor: 'text-red-400' },
        { key: 'actionUp', label: 'X (Nintendo 上ボタン)', badgeColor: 'text-neutral-200' },
        { key: 'actionLeft', label: 'Y (Nintendo 左ボタン)', badgeColor: 'text-neutral-200' },
        { key: 'l1', label: 'L', badgeColor: 'text-neutral-200' },
        { key: 'r1', label: 'R', badgeColor: 'text-neutral-200' },
        { key: 'l2', label: 'ZL', badgeColor: 'text-red-400' },
        { key: 'r2', label: 'ZR', badgeColor: 'text-red-400' },
        { key: 'l3', label: '左スティック押し込み', badgeColor: 'text-neutral-300' },
        { key: 'r3', label: '右スティック押し込み', badgeColor: 'text-neutral-300' },
        { key: 'dpadUp', label: '十字ボタン ↑', badgeColor: 'text-neutral-300' },
        { key: 'dpadDown', label: '十字ボタン ↓', badgeColor: 'text-neutral-300' },
        { key: 'dpadLeft', label: '十字ボタン ←', badgeColor: 'text-neutral-300' },
        { key: 'dpadRight', label: '十字ボタン →', badgeColor: 'text-neutral-300' },
        { key: 'select', label: 'Minus (-)', badgeColor: 'text-neutral-400' },
        { key: 'start', label: 'Plus (+)', badgeColor: 'text-neutral-400' },
        { key: 'home', label: 'HOME ボタン', badgeColor: 'text-blue-400' },
        { key: 'touchpadClick', label: 'キャプチャー ボタン', badgeColor: 'text-neutral-300' },
        { key: 'none', label: '未割り当て (無効)', badgeColor: 'text-neutral-500' },
      ];

  // Update a single button remap
  const handleAssignButton = (v3Key: V3PhysicalButton, targetKey: TargetGamepadButtonKey) => {
    const updated = { ...remapTable, [v3Key]: targetKey };
    setProfile({
      ...profile,
      v3RemapTable: updated,
    });
    setListenModeKey(null);
  };

  // Preset Handlers
  const handleApplyPreset = (presetType: 'default' | 'switch_inverted' | 'fps_triggers' | 'clear') => {
    let newTable: V3ButtonRemapTable;

    if (presetType === 'default') {
      newTable = { ...DEFAULT_V3_REMAP_TABLE };
    } else if (presetType === 'switch_inverted') {
      // Invert A <-> B and X <-> Y
      newTable = {
        ...DEFAULT_V3_REMAP_TABLE,
        btn_a: 'actionRight', // A
        btn_b: 'actionDown',  // B
        btn_x: 'actionUp',    // X
        btn_y: 'actionLeft',  // Y
      };
    } else if (presetType === 'fps_triggers') {
      // Swaps R1/R2 and L1/L2 so bumpers fire immediately (Hair trigger)
      newTable = {
        ...DEFAULT_V3_REMAP_TABLE,
        btn_r1: 'r2', // R1 fires weapon
        btn_r2: 'r1', // R2 throws grenade
        btn_l1: 'l2', // L1 ADS Aim
        btn_l2: 'l1', // L2 Tactical
      };
    } else {
      // Clear all
      newTable = {} as V3ButtonRemapTable;
      V3_BUTTONS.forEach(b => {
        newTable[b.key] = 'none';
      });
    }

    setProfile({
      ...profile,
      v3RemapTable: newTable,
    });
  };

  // Filtered V3 buttons
  const filteredButtons = activeCategory === 'all'
    ? V3_BUTTONS
    : V3_BUTTONS.filter(b => b.category === activeCategory);

  // Check if a target button is currently active on the visualizer
  const isTargetPressed = (targetKey: TargetGamepadButtonKey): boolean => {
    if (targetKey === 'none') return false;
    return !!(gamepadState.buttons as any)[targetKey];
  };

  return (
    <div className="space-y-6">
      {/* Top Config Card */}
      <div className="rounded-[22px] border border-white/10 bg-[#121d2b]/90 p-4 shadow-xl backdrop-blur space-y-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-indigo-400" />
              <span>ShootingPlus V3 ⇄ {isDS4 ? 'DUALSHOCK 4' : 'Switch Pro'} ボタン割り当て</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              V3コントローラーの各物理ボタン（A/B/X/Y/L1/R1/L2/R2等）を押した時に、
              {isDS4 ? 'DUALSHOCK 4' : 'Switch Pro'}のどのボタンとして出力するかを1対1で自由にカスタマイズ
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-500 font-medium">プリセット:</span>
            <button
              onClick={() => handleApplyPreset('default')}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              標準 1:1 配列
            </button>
            <button
              onClick={() => handleApplyPreset('switch_inverted')}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              任天堂 A/B・X/Y 反転
            </button>
            <button
              onClick={() => handleApplyPreset('fps_triggers')}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              FPS 高速射撃 (R1/L1発射)
            </button>
            <button
              onClick={() => handleApplyPreset('clear')}
              className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 transition-colors"
            >
              クリア
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="crosspad-remap-tabs flex w-full min-w-0 max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-[#0a1422] p-1.5 text-xs md:w-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeCategory === 'all'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              すべて ({V3_BUTTONS.length})
            </button>
            <button
              onClick={() => setActiveCategory('face')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeCategory === 'face'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              前面 4ボタン (ABXY)
            </button>
            <button
              onClick={() => setActiveCategory('shoulder')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeCategory === 'shoulder'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              LR バンパー & トリガー
            </button>
            <button
              onClick={() => setActiveCategory('dpad')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeCategory === 'dpad'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              十字キー (D-Pad)
            </button>
            <button
              onClick={() => setActiveCategory('thumb')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeCategory === 'thumb'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              スティック押し込み (L3/R3)
            </button>
          </div>

          {/* Stick Special Remap Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stickRemap.swapSticks}
                onChange={e =>
                  setProfile({
                    ...profile,
                    v3StickRemap: { ...stickRemap, swapSticks: e.target.checked },
                  })
                }
                className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
              />
              <span>左スティックと右スティックを入れ替え</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stickRemap.leftStickToDpad}
                onChange={e =>
                  setProfile({
                    ...profile,
                    v3StickRemap: { ...stickRemap, leftStickToDpad: e.target.checked },
                  })
                }
                className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
              />
              <span>左スティックを十字キーにも同時出力</span>
            </label>
          </div>
        </div>
      </div>

      {/* Button Mapping Matrix Grid */}
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {filteredButtons.map(btn => {
          const currentTarget = remapTable[btn.key] || 'none';
          const isPressed = isTargetPressed(currentTarget);
          const isListening = listenModeKey === btn.key;

          const targetObj = targetOptions.find(o => o.key === currentTarget);

          return (
            <div
              key={btn.key}
              className={`rounded-xl border p-4 transition-all ${
                isPressed
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                  : isListening
                  ? 'bg-indigo-950/50 border-indigo-500 animate-pulse'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Header row: V3 physical button */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">{btn.name}</span>
                  {isPressed && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700">
                      押下中
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {btn.key.toUpperCase()}
                </span>
              </div>

              {/* Remap Arrow & Target Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="text-[11px]">出力先 ({isDS4 ? 'DUALSHOCK 4' : 'Switch Pro'})</span>
                  <ArrowRight className="h-3 w-3 text-neutral-500" />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentTarget}
                    onChange={e => handleAssignButton(btn.key, e.target.value as TargetGamepadButtonKey)}
                    className="min-w-0 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-200 focus:border-cyan-400 focus:outline-none"
                  >
                    {targetOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Button Visual Representation */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                  <span className="truncate">{btn.defaultLabel}</span>
                  <span className={`font-semibold ${targetObj?.badgeColor || 'text-neutral-400'}`}>
                    {targetObj ? targetObj.label.split(' ')[0] : 'なし'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide & Help Callout */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-200">
            カスタム割り当てはリアルタイム・ブリッジ出力両方に即座に反映されます
          </p>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            ここで設定したボタン割り当ては、画面上のコントローラーモニターだけでなく、
            「ブリッジ出力」からダウンロードできる Windows ViGEm Pythonスクリプト や ESP32 C++ファームウェア にもそのまま自動反映されます。
          </p>
        </div>
      </div>
    </div>
  );
};

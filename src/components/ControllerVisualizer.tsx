import React from 'react';
import { GamepadState, TargetControllerType } from '../types/controller';
import { Radio, Activity, Compass, Zap } from 'lucide-react';

interface ControllerVisualizerProps {
  state: GamepadState;
  targetController: TargetControllerType;
  onButtonPress?: (buttonKey: keyof GamepadState['buttons'], isPressed: boolean) => void;
  onStickMove?: (stick: 'left' | 'right', x: number, y: number) => void;
  onLightbarChange?: (color: string) => void;
}

export const ControllerVisualizer: React.FC<ControllerVisualizerProps> = ({
  state,
  targetController,
  onButtonPress,
  onStickMove,
  onLightbarChange,
}) => {
  const isDS4 = targetController === 'DS4';
  const { buttons, leftStick, rightStick, gyro, ds4 } = state;

  return (
    <div className="w-full space-y-4">
      {/* Visualizer Shell */}
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {isDS4 ? 'Sony DUALSHOCK 4 (CUH-ZCT2)' : 'Nintendo Switch Pro Controller'}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="font-mono text-xs text-neutral-400">
              {isDS4 ? 'Report ID 0x01 / 64-byte HID' : 'Subcommand 0x30 / 49-byte Report'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">PACKETS</span>
              <span className="text-white font-semibold tabular-nums">{state.packetCounter}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">L2 TRIGGER</span>
              <span className="text-indigo-400 font-semibold tabular-nums">
                {Math.round((buttons.l2Value || (buttons.l2 ? 1 : 0)) * 255)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">R2 TRIGGER</span>
              <span className="text-indigo-400 font-semibold tabular-nums">
                {Math.round((buttons.r2Value || (buttons.r2 ? 1 : 0)) * 255)}
              </span>
            </div>
          </div>
        </div>

        {/* Controller Canvas / Interactive Graphic */}
        <div className="relative my-6 flex flex-col items-center justify-center">
          {isDS4 ? (
            /* ================= DUALSHOCK 4 VISUALIZER ================= */
            <div className="relative w-full max-w-[620px] aspect-[16/10] select-none">
              {/* Outer Shell SVG */}
              <svg viewBox="0 0 600 380" className="w-full h-full drop-shadow-2xl">
                <defs>
                  {/* Subtle controller body gradient */}
                  <linearGradient id="ds4Body" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#24272D" />
                    <stop offset="60%" stopColor="#181A1F" />
                    <stop offset="100%" stopColor="#111317" />
                  </linearGradient>
                  <linearGradient id="ds4Grip" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2A2E36" />
                    <stop offset="100%" stopColor="#121317" />
                  </linearGradient>
                  <radialGradient id="thumbstickGrip" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#353942" />
                    <stop offset="70%" stopColor="#202227" />
                    <stop offset="100%" stopColor="#15171B" />
                  </radialGradient>
                </defs>

                {/* Controller Handles & Base Silhouette */}
                <path
                  d="M140 100 
                     C 180 85, 230 85, 300 88 
                     C 370 85, 420 85, 460 100 
                     C 500 115, 540 160, 560 250 
                     C 575 320, 540 370, 485 365 
                     C 440 360, 405 285, 370 270 
                     C 340 260, 260 260, 230 270 
                     C 195 285, 160 360, 115 365 
                     C 60 370, 25 320, 40 250 
                     C 60 160, 100 115, 140 100 Z"
                  fill="url(#ds4Body)"
                  stroke="#383D47"
                  strokeWidth="2.5"
                />

                {/* Left Grip Seam */}
                <path
                  d="M 60 230 C 80 180, 110 130, 150 110"
                  fill="none"
                  stroke="#2F333C"
                  strokeWidth="1.5"
                />
                {/* Right Grip Seam */}
                <path
                  d="M 540 230 C 520 180, 490 130, 450 110"
                  fill="none"
                  stroke="#2F333C"
                  strokeWidth="1.5"
                />

                {/* Lightbar (Top Center Glow) */}
                <rect
                  x="230"
                  y="76"
                  width="140"
                  height="12"
                  rx="6"
                  fill={ds4.lightbarColor}
                  className="transition-colors duration-200"
                  style={{
                    filter: `drop-shadow(0px 0px 8px ${ds4.lightbarColor})`,
                  }}
                />

                {/* Touchpad Plate */}
                <rect
                  x="220"
                  y="96"
                  width="160"
                  height="95"
                  rx="10"
                  fill={buttons.touchpadClick ? '#2F3542' : '#1C1F24'}
                  stroke={buttons.touchpadClick ? '#60A5FA' : '#333842'}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors"
                  onClick={() => onButtonPress?.('touchpadClick', !buttons.touchpadClick)}
                />
                <text
                  x="300"
                  y="148"
                  textAnchor="middle"
                  fill="#5A6270"
                  fontSize="9"
                  fontFamily="monospace"
                  letterSpacing="1"
                >
                  TOUCHPAD CLICK
                </text>

                {/* D-Pad Backplate */}
                <circle cx="155" cy="180" r="46" fill="#14161A" stroke="#2B2F38" strokeWidth="1.5" />

                {/* Action Buttons Backplate */}
                <circle cx="445" cy="180" r="46" fill="#14161A" stroke="#2B2F38" strokeWidth="1.5" />

                {/* PS Button (Center Circle) */}
                <circle
                  cx="300"
                  cy="235"
                  r="14"
                  fill={buttons.home ? '#3B82F6' : '#17191E'}
                  stroke="#3A3E48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('home', !buttons.home)}
                />
                <text
                  x="300"
                  y="239"
                  textAnchor="middle"
                  fill={buttons.home ? '#FFFFFF' : '#8E96A5'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  P
                </text>

                {/* Share Button (Left of Touchpad) */}
                <rect
                  x="188"
                  y="108"
                  width="18"
                  height="28"
                  rx="4"
                  fill={buttons.select ? '#3B82F6' : '#22252C'}
                  stroke="#3A3E48"
                  strokeWidth="1"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('select', !buttons.select)}
                />
                <text x="197" y="100" textAnchor="middle" fill="#6A7280" fontSize="8" fontWeight="600">
                  SHARE
                </text>

                {/* Options Button (Right of Touchpad) */}
                <rect
                  x="394"
                  y="108"
                  width="18"
                  height="28"
                  rx="4"
                  fill={buttons.start ? '#3B82F6' : '#22252C'}
                  stroke="#3A3E48"
                  strokeWidth="1"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('start', !buttons.start)}
                />
                <text x="403" y="100" textAnchor="middle" fill="#6A7280" fontSize="8" fontWeight="600">
                  OPTIONS
                </text>

                {/* Left Stick Base (Symmetrical: Bottom Left) */}
                <circle cx="215" cy="255" r="38" fill="#131518" stroke="#2A2E37" strokeWidth="2" />
                {/* Right Stick Base (Symmetrical: Bottom Right) */}
                <circle cx="385" cy="255" r="38" fill="#131518" stroke="#2A2E37" strokeWidth="2" />

                {/* Left Analog Thumbstick (Dynamic SVG Offset) */}
                <g
                  transform={`translate(${215 + leftStick.x * 22}, ${255 - leftStick.y * 22})`}
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l3', !buttons.l3)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="26"
                    fill="url(#thumbstickGrip)"
                    stroke={buttons.l3 ? '#60A5FA' : '#3F4450'}
                    strokeWidth="2"
                    className="drop-shadow-md"
                  />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#2F333D" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="4" fill={buttons.l3 ? '#60A5FA' : '#454A57'} />
                </g>

                {/* Right Analog Thumbstick (Dynamic SVG Offset) */}
                <g
                  transform={`translate(${385 + rightStick.x * 22}, ${255 - rightStick.y * 22})`}
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r3', !buttons.r3)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="26"
                    fill="url(#thumbstickGrip)"
                    stroke={buttons.r3 ? '#60A5FA' : '#3F4450'}
                    strokeWidth="2"
                    className="drop-shadow-md"
                  />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#2F333D" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="4" fill={buttons.r3 ? '#60A5FA' : '#454A57'} />
                </g>

                {/* L1 & R1 Bumpers (Top shoulders) */}
                <rect
                  x="120"
                  y="46"
                  width="68"
                  height="22"
                  rx="6"
                  fill={buttons.l1 ? '#3B82F6' : '#22252C'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l1', !buttons.l1)}
                />
                <text x="154" y="61" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  L1
                </text>

                <rect
                  x="412"
                  y="46"
                  width="68"
                  height="22"
                  rx="6"
                  fill={buttons.r1 ? '#3B82F6' : '#22252C'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r1', !buttons.r1)}
                />
                <text x="446" y="61" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  R1
                </text>

                {/* L2 & R2 Triggers (Above Bumpers) */}
                <path
                  d="M 125 40 C 130 18, 175 18, 180 40 Z"
                  fill={buttons.l2 || buttons.l2Value > 0.1 ? '#2563EB' : '#1A1C22'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l2', !buttons.l2)}
                />
                <text x="153" y="32" textAnchor="middle" fill="#93C5FD" fontSize="9" fontWeight="bold">
                  L2
                </text>

                <path
                  d="M 420 40 C 425 18, 470 18, 475 40 Z"
                  fill={buttons.r2 || buttons.r2Value > 0.1 ? '#2563EB' : '#1A1C22'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r2', !buttons.r2)}
                />
                <text x="447" y="32" textAnchor="middle" fill="#93C5FD" fontSize="9" fontWeight="bold">
                  R2
                </text>
              </svg>

              {/* D-Pad Buttons Overlay (clickable) */}
              <div className="absolute top-[37%] left-[22.5%] -translate-x-1/2 -translate-y-1/2 w-24 h-24">
                {/* Dpad Up */}
                <button
                  onClick={() => onButtonPress?.('dpadUp', !buttons.dpadUp)}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-7 h-8 rounded-t border transition-all ${
                    buttons.dpadUp
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▲
                </button>
                {/* Dpad Down */}
                <button
                  onClick={() => onButtonPress?.('dpadDown', !buttons.dpadDown)}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-8 rounded-b border transition-all ${
                    buttons.dpadDown
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▼
                </button>
                {/* Dpad Left */}
                <button
                  onClick={() => onButtonPress?.('dpadLeft', !buttons.dpadLeft)}
                  className={`absolute top-1/2 left-0 -translate-y-1/2 w-8 h-7 rounded-l border transition-all ${
                    buttons.dpadLeft
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ◀
                </button>
                {/* Dpad Right */}
                <button
                  onClick={() => onButtonPress?.('dpadRight', !buttons.dpadRight)}
                  className={`absolute top-1/2 right-0 -translate-y-1/2 w-8 h-7 rounded-r border transition-all ${
                    buttons.dpadRight
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▶
                </button>
              </div>

              {/* Action Buttons Overlay (PlayStation Triangle, Circle, Cross, Square) */}
              <div className="absolute top-[37%] left-[77.5%] -translate-x-1/2 -translate-y-1/2 w-24 h-24">
                {/* Triangle (Up) */}
                <button
                  onClick={() => onButtonPress?.('actionUp', !buttons.actionUp)}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionUp
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-emerald-400 hover:bg-neutral-700'
                  }`}
                  title="Triangle (△)"
                >
                  △
                </button>
                {/* Circle (Right) */}
                <button
                  onClick={() => onButtonPress?.('actionRight', !buttons.actionRight)}
                  className={`absolute top-1/2 right-0 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionRight
                      ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-rose-400 hover:bg-neutral-700'
                  }`}
                  title="Circle (○)"
                >
                  ○
                </button>
                {/* Cross (Down) */}
                <button
                  onClick={() => onButtonPress?.('actionDown', !buttons.actionDown)}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionDown
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-blue-400 hover:bg-neutral-700'
                  }`}
                  title="Cross (✕)"
                >
                  ✕
                </button>
                {/* Square (Left) */}
                <button
                  onClick={() => onButtonPress?.('actionLeft', !buttons.actionLeft)}
                  className={`absolute top-1/2 left-0 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionLeft
                      ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-pink-400 hover:bg-neutral-700'
                  }`}
                  title="Square (□)"
                >
                  □
                </button>
              </div>
            </div>
          ) : (
            /* ================= NINTENDO SWITCH PRO VISUALIZER ================= */
            <div className="relative w-full max-w-[620px] aspect-[16/10] select-none">
              <svg viewBox="0 0 600 380" className="w-full h-full drop-shadow-2xl">
                <defs>
                  <linearGradient id="switchProBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#25272B" />
                    <stop offset="50%" stopColor="#1B1D21" />
                    <stop offset="100%" stopColor="#101114" />
                  </linearGradient>
                  <radialGradient id="switchStickGrip" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3A3E47" />
                    <stop offset="70%" stopColor="#22252C" />
                    <stop offset="100%" stopColor="#131417" />
                  </radialGradient>
                </defs>

                {/* Switch Pro Curved Ergonomic Shell */}
                <path
                  d="M130 90 
                     C 180 75, 240 75, 300 75 
                     C 360 75, 420 75, 470 90 
                     C 515 105, 555 160, 565 240 
                     C 575 315, 535 365, 480 360 
                     C 435 355, 410 275, 375 260 
                     C 340 250, 260 250, 225 260 
                     C 190 275, 165 355, 120 360 
                     C 65 365, 25 315, 35 240 
                     C 45 160, 85 105, 130 90 Z"
                  fill="url(#switchProBody)"
                  stroke="#383D47"
                  strokeWidth="2.5"
                />

                {/* Semi-translucent circuit accents */}
                <path
                  d="M 180 120 L 220 160 M 380 160 L 420 120"
                  stroke="#2E323B"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Left Stick Base (Switch Asymmetrical: TOP LEFT) */}
                <circle cx="160" cy="165" r="40" fill="#131518" stroke="#2A2E37" strokeWidth="2" />
                {/* Right Stick Base (Switch Asymmetrical: BOTTOM RIGHT) */}
                <circle cx="395" cy="245" r="40" fill="#131518" stroke="#2A2E37" strokeWidth="2" />

                {/* Switch Left Stick (Top-Left) */}
                <g
                  transform={`translate(${160 + leftStick.x * 24}, ${165 - leftStick.y * 24})`}
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l3', !buttons.l3)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="27"
                    fill="url(#switchStickGrip)"
                    stroke={buttons.l3 ? '#EF4444' : '#3F4450'}
                    strokeWidth="2"
                  />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#2B2E37" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="4" fill={buttons.l3 ? '#EF4444' : '#454A57'} />
                </g>

                {/* Switch Right Stick (Bottom-Right) */}
                <g
                  transform={`translate(${395 + rightStick.x * 24}, ${245 - rightStick.y * 24})`}
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r3', !buttons.r3)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="27"
                    fill="url(#switchStickGrip)"
                    stroke={buttons.r3 ? '#EF4444' : '#3F4450'}
                    strokeWidth="2"
                  />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#2B2E37" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="4" fill={buttons.r3 ? '#EF4444' : '#454A57'} />
                </g>

                {/* Minus (-) Button */}
                <circle
                  cx="235"
                  cy="130"
                  r="9"
                  fill={buttons.select ? '#EF4444' : '#22252C'}
                  stroke="#383D47"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('select', !buttons.select)}
                />
                <text x="235" y="133" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">
                  -
                </text>

                {/* Plus (+) Button */}
                <circle
                  cx="365"
                  cy="130"
                  r="9"
                  fill={buttons.start ? '#EF4444' : '#22252C'}
                  stroke="#383D47"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('start', !buttons.start)}
                />
                <text x="365" y="134" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">
                  +
                </text>

                {/* Capture Button (Square) */}
                <rect
                  x="245"
                  y="180"
                  width="18"
                  height="18"
                  rx="3"
                  fill={buttons.touchpadClick ? '#EF4444' : '#1C1F25'}
                  stroke="#383D47"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('touchpadClick', !buttons.touchpadClick)}
                />
                <circle cx="254" cy="189" r="4" fill="#6A7280" />

                {/* Home Button with Blue Light Ring */}
                <circle
                  cx="345"
                  cy="189"
                  r="11"
                  fill={buttons.home ? '#3B82F6' : '#1C1F25'}
                  stroke="#3882F6"
                  strokeWidth={buttons.home ? '3' : '1.5'}
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('home', !buttons.home)}
                />
                <path
                  d="M 341 192 L 345 186 L 349 192 Z"
                  fill={buttons.home ? '#FFFFFF' : '#94A3B8'}
                />

                {/* L / R Shoulders */}
                <rect
                  x="120"
                  y="46"
                  width="68"
                  height="22"
                  rx="6"
                  fill={buttons.l1 ? '#EF4444' : '#22252C'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l1', !buttons.l1)}
                />
                <text x="154" y="61" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  L
                </text>

                <rect
                  x="412"
                  y="46"
                  width="68"
                  height="22"
                  rx="6"
                  fill={buttons.r1 ? '#EF4444' : '#22252C'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r1', !buttons.r1)}
                />
                <text x="446" y="61" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  R
                </text>

                {/* ZL / ZR Triggers */}
                <path
                  d="M 125 40 C 130 18, 175 18, 180 40 Z"
                  fill={buttons.l2 || buttons.l2Value > 0.1 ? '#DC2626' : '#1A1C22'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('l2', !buttons.l2)}
                />
                <text x="153" y="32" textAnchor="middle" fill="#FCA5A5" fontSize="9" fontWeight="bold">
                  ZL
                </text>

                <path
                  d="M 420 40 C 425 18, 470 18, 475 40 Z"
                  fill={buttons.r2 || buttons.r2Value > 0.1 ? '#DC2626' : '#1A1C22'}
                  stroke="#383D48"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => onButtonPress?.('r2', !buttons.r2)}
                />
                <text x="447" y="32" textAnchor="middle" fill="#FCA5A5" fontSize="9" fontWeight="bold">
                  ZR
                </text>
              </svg>

              {/* Switch D-Pad Overlay (BOTTOM LEFT) */}
              <div className="absolute top-[64%] left-[26%] -translate-x-1/2 -translate-y-1/2 w-22 h-22">
                <button
                  onClick={() => onButtonPress?.('dpadUp', !buttons.dpadUp)}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-7 rounded-t border transition-all ${
                    buttons.dpadUp
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▲
                </button>
                <button
                  onClick={() => onButtonPress?.('dpadDown', !buttons.dpadDown)}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-7 rounded-b border transition-all ${
                    buttons.dpadDown
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▼
                </button>
                <button
                  onClick={() => onButtonPress?.('dpadLeft', !buttons.dpadLeft)}
                  className={`absolute top-1/2 left-0 -translate-y-1/2 w-7 h-6 rounded-l border transition-all ${
                    buttons.dpadLeft
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ◀
                </button>
                <button
                  onClick={() => onButtonPress?.('dpadRight', !buttons.dpadRight)}
                  className={`absolute top-1/2 right-0 -translate-y-1/2 w-7 h-6 rounded-r border transition-all ${
                    buttons.dpadRight
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  ▶
                </button>
              </div>

              {/* Switch Action Buttons (TOP RIGHT: X at Top, A at Right, B at Bottom, Y at Left) */}
              <div className="absolute top-[37%] left-[76%] -translate-x-1/2 -translate-y-1/2 w-24 h-24">
                {/* Switch X (Top) */}
                <button
                  onClick={() => onButtonPress?.('actionUp', !buttons.actionUp)}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionUp
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  }`}
                  title="X Button (Nintendo Top)"
                >
                  X
                </button>
                {/* Switch A (Right - Confirm) */}
                <button
                  onClick={() => onButtonPress?.('actionRight', !buttons.actionRight)}
                  className={`absolute top-1/2 right-0 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionRight
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  }`}
                  title="A Button (Nintendo Right)"
                >
                  A
                </button>
                {/* Switch B (Bottom - Back/Cancel) */}
                <button
                  onClick={() => onButtonPress?.('actionDown', !buttons.actionDown)}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionDown
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  }`}
                  title="B Button (Nintendo Bottom)"
                >
                  B
                </button>
                {/* Switch Y (Left) */}
                <button
                  onClick={() => onButtonPress?.('actionLeft', !buttons.actionLeft)}
                  className={`absolute top-1/2 left-0 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-all ${
                    buttons.actionLeft
                      ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50 scale-105'
                      : 'bg-neutral-800/95 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  }`}
                  title="Y Button (Nintendo Left)"
                >
                  Y
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-neutral-800/80 text-xs">
          {/* Left Stick Telemetry */}
          <div className="rounded-lg bg-neutral-950/60 p-3 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-300">Lスティック (移動)</span>
              <span className="font-mono text-[10px]">{buttons.l3 ? 'L3押し込み' : '未押下'}</span>
            </div>
            <div className="flex items-center justify-between font-mono tabular-nums text-neutral-200">
              <span>X: {leftStick.x >= 0 ? `+${leftStick.x.toFixed(2)}` : leftStick.x.toFixed(2)}</span>
              <span>Y: {leftStick.y >= 0 ? `+${leftStick.y.toFixed(2)}` : leftStick.y.toFixed(2)}</span>
            </div>
          </div>

          {/* Right Stick Telemetry */}
          <div className="rounded-lg bg-neutral-950/60 p-3 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-300">Rスティック (視点)</span>
              <span className="font-mono text-[10px]">{buttons.r3 ? 'R3押し込み' : '未押下'}</span>
            </div>
            <div className="flex items-center justify-between font-mono tabular-nums text-neutral-200">
              <span>X: {rightStick.x >= 0 ? `+${rightStick.x.toFixed(2)}` : rightStick.x.toFixed(2)}</span>
              <span>Y: {rightStick.y >= 0 ? `+${rightStick.y.toFixed(2)}` : rightStick.y.toFixed(2)}</span>
            </div>
          </div>

          {/* Gyro Sensor Telemetry */}
          <div className="rounded-lg bg-neutral-950/60 p-3 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-300">6軸ジャイロ / 加速度</span>
              <span className="font-mono text-[10px]">IMU</span>
            </div>
            <div className="flex items-center justify-between font-mono tabular-nums text-neutral-200">
              <span>P: {gyro.pitch.toFixed(1)}°</span>
              <span>R: {gyro.roll.toFixed(1)}°</span>
              <span>Y: {gyro.yaw.toFixed(1)}°</span>
            </div>
          </div>

          {/* Protocol Target Info */}
          <div className="rounded-lg bg-neutral-950/60 p-3 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-300">エミュレーション先</span>
              <span className={`w-2 h-2 rounded-full ${isDS4 ? 'bg-blue-500' : 'bg-red-500'}`} />
            </div>
            <div className="font-mono text-neutral-200 truncate">
              {isDS4 ? 'VID: 0x054C / PID: 0x09CC' : 'VID: 0x057E / PID: 0x2009'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

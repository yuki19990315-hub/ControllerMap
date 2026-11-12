import React from 'react';
import { TargetControllerType } from '../types/controller';
import { Gamepad2, Download, HelpCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'visualizer' | 'remapper' | 'mapper' | 'calibration' | 'telemetry' | 'bridge';
  setActiveTab: (tab: 'visualizer' | 'remapper' | 'mapper' | 'calibration' | 'telemetry' | 'bridge') => void;
  targetController: TargetControllerType;
  setTargetController: (target: TargetControllerType) => void;
  onOpenGuide: () => void;
  onOpenExport: () => void;
  onOpenAndroidPackage: () => void;
  connectedDeviceCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  targetController,
  setTargetController,
  onOpenGuide,
  onOpenExport,
  onOpenAndroidPackage,
  connectedDeviceCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              CrossPad Studio
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span>スマホ入力変換</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{connectedDeviceCount > 0 ? `${connectedDeviceCount}台接続中` : '待機中'}</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'visualizer'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            コントローラー変換
          </button>
          <button
            onClick={() => setActiveTab('remapper')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'remapper'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            V3ボタン割り当て
          </button>
          <button
            onClick={() => setActiveTab('mapper')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'mapper'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            画面マッピング
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'calibration'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            スティック・ジャイロ調整
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            BLEパケット解析
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'bridge'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            PC / ESP32連携
          </button>
        </nav>

        {/* Zone 3: Primary Action & Target Controller Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Target Controller Mode Toggle */}
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1">
            <button
              onClick={() => setTargetController('DS4')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                targetController === 'DS4'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Sony DUALSHOCK 4 モード"
            >
              DUALSHOCK 4
            </button>
            <button
              onClick={() => setTargetController('SWITCH_PRO')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                targetController === 'SWITCH_PRO'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Nintendo Switch Pro Controller モード"
            >
              Switch Pro
            </button>
          </div>

          <button
            onClick={onOpenAndroidPackage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 rounded-lg border border-emerald-800/60 bg-emerald-950/40 hover:bg-emerald-950/70 transition-colors whitespace-nowrap shrink-0"
          >
            <span>📱 APK / スマホ導入</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white rounded-lg border border-neutral-800 hover:bg-neutral-900 transition-colors whitespace-nowrap shrink-0"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>仕組み</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>出力</span>
          </button>
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="flex md:hidden overflow-x-auto border-t border-neutral-900 px-4 py-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'visualizer' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          変換モニター
        </button>
        <button
          onClick={() => setActiveTab('remapper')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'remapper' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          V3ボタン割り当て
        </button>
        <button
          onClick={() => setActiveTab('mapper')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'mapper' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          画面マッピング
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'calibration' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          調整
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'telemetry' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          BLE解析
        </button>
        <button
          onClick={() => setActiveTab('bridge')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'bridge' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          出力
        </button>
      </div>
    </header>
  );
};

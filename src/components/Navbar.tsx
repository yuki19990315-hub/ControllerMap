import React from 'react';
import { TargetControllerType } from '../types/controller';
import {
  Gamepad2, Download, HelpCircle, Smartphone, SlidersHorizontal,
  Map, Activity, Cable, Settings2, Radio, ArrowUpRight
} from 'lucide-react';

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

const tabs = [
  { id: 'visualizer', title: '変換モニター', short: 'ホーム', icon: Gamepad2 },
  { id: 'remapper', title: 'ボタン割り当て', short: 'ボタン', icon: SlidersHorizontal },
  { id: 'mapper', title: '画面マッピング', short: 'マップ', icon: Map },
  { id: 'calibration', title: '感度・ジャイロ', short: '調整', icon: Settings2 },
  { id: 'telemetry', title: 'パケット解析', short: '解析', icon: Activity },
  { id: 'bridge', title: 'PC / ESP32連携', short: '連携', icon: Cable },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, targetController, setTargetController,
  onOpenGuide, onOpenExport, onOpenAndroidPackage, connectedDeviceCount,
}) => {
  return (
    <>
      <header className="crosspad-topbar sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a101d]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[68px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-violet-500/20 text-cyan-300 shadow-lg shadow-cyan-950/40">
                <Gamepad2 className="h-6 w-6" strokeWidth={2.1} aria-hidden="true" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0a101d] bg-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-black tracking-tight text-white">CROSSPAD<span className="text-cyan-400">.</span></div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-slate-400">
                  <span className={connectedDeviceCount > 0 ? 'h-1.5 w-1.5 rounded-full bg-emerald-400' : 'h-1.5 w-1.5 rounded-full bg-amber-400'} />
                  {connectedDeviceCount > 0 ? connectedDeviceCount + '台接続中' : '接続待機中'}
                  <span className="hidden min-[370px]:inline text-slate-600">/</span>
                  <span className="hidden min-[370px]:inline">CONTROLLER STUDIO</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onOpenGuide} aria-label="使い方を見る" title="使い方を見る" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400">
                <HelpCircle className="h-5 w-5" />
              </button>
              <button type="button" onClick={onOpenExport} title="コードを書き出す" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3.5 text-sm font-bold text-[#071321] shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-white">
                <Download className="h-4 w-4" />
                <span className="hidden min-[370px]:inline">出力</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-3">
            <div className="inline-flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-[#111d2c] p-1 sm:flex-none" role="group" aria-label="変換先コントローラー">
              <button type="button" onClick={() => setTargetController('DS4')} aria-pressed={targetController === 'DS4'} className={targetController === 'DS4' ? 'min-h-9 flex-1 rounded-lg bg-blue-500 px-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 sm:flex-none' : 'min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:text-white sm:flex-none'}>
                DUALSHOCK 4
              </button>
              <button type="button" onClick={() => setTargetController('SWITCH_PRO')} aria-pressed={targetController === 'SWITCH_PRO'} className={targetController === 'SWITCH_PRO' ? 'min-h-9 flex-1 rounded-lg bg-rose-500 px-3 text-xs font-bold text-white shadow-md shadow-rose-500/25 sm:flex-none' : 'min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:text-white sm:flex-none'}>
                Switch Pro
              </button>
            </div>
            <button type="button" onClick={onOpenAndroidPackage} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20">
              <Smartphone className="h-4 w-4" />
              <span className="hidden min-[410px]:inline">スマホ導入</span>
              <ArrowUpRight className="hidden h-3.5 w-3.5 min-[410px]:inline" />
            </button>
          </div>

          <nav className="hidden gap-1 overflow-x-auto pb-2 md:flex" aria-label="メインメニュー">
            {tabs.map(({ id, title, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={activeTab === id ? 'flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200' : 'flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white'}>
                <Icon className="h-4 w-4" />
                {title}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <nav className="crosspad-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 gap-0.5 border-t border-white/15 bg-[#0a1424]/95 px-2 pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:hidden" aria-label="スマホ用メインメニュー">
        {tabs.map(({ id, short, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-label={tabs.find(tab => tab.id === id)?.title} aria-current={activeTab === id ? 'page' : undefined} className={activeTab === id ? 'relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-cyan-400/10 text-cyan-300' : 'relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-slate-400 transition active:bg-white/10'}>
            {activeTab === id && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-cyan-400" />}
            <Icon className="h-5 w-5" strokeWidth={activeTab === id ? 2.4 : 1.9} />
            <span className="text-[10px] font-bold leading-none">{short}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

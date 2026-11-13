import React, { useState } from 'react';
import { ConnectedDevice, InputProtocolType } from '../types/controller';
import { Bluetooth, Usb, Gamepad2, Keyboard, CircleCheck, ChevronDown, Link2, Wifi, AlertCircle } from 'lucide-react';

interface DeviceConnectorProps {
  connectedDevices: ConnectedDevice[];
  onConnectBLE: () => Promise<void>;
  onConnectHID: () => Promise<void>;
  onDisconnectDevice: (id: string) => void;
  selectedProtocol: InputProtocolType;
  setSelectedProtocol: (protocol: InputProtocolType) => void;
  isBLESupported: boolean;
  isHIDSupported: boolean;
  onSimulateVirtualDevice: () => void;
}

export const DeviceConnector: React.FC<DeviceConnectorProps> = ({
  connectedDevices, onConnectBLE, onConnectHID, onDisconnectDevice,
  selectedProtocol, setSelectedProtocol, isBLESupported, isHIDSupported,
  onSimulateVirtualDevice,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleBLEClick = async () => {
    setConnecting(true);
    setStatusMessage('Bluetooth LE デバイスを検索しています…');
    try {
      await onConnectBLE();
      setStatusMessage('Bluetooth の接続処理が完了しました');
    } catch (err: any) {
      setStatusMessage(err?.name === 'NotFoundError' ? 'Bluetooth 接続をキャンセルしました' : '接続エラー: ' + (err?.message || '接続できませんでした'));
    } finally {
      setConnecting(false);
    }
  };

  const handleHIDClick = async () => {
    setConnecting(true);
    setStatusMessage('HID デバイスを検索しています…');
    try {
      await onConnectHID();
      setStatusMessage('HID の接続処理が完了しました');
    } catch (err: any) {
      setStatusMessage(err?.name === 'NotFoundError' ? 'HID 接続をキャンセルしました' : '接続エラー: ' + (err?.message || '接続できませんでした'));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#121d2b]/90 shadow-xl shadow-black/10" aria-label="入力デバイス接続">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-extrabold tracking-tight text-white">入力デバイス</h2>
            <span className={connectedDevices.length > 0 ? 'rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300' : 'rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400'}>
              {connectedDevices.length > 0 ? connectedDevices.length + '台接続中' : '未接続'}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Bluetooth・USB・仮想入力を管理</p>
        </div>
        <button type="button" onClick={() => setMobileExpanded(!mobileExpanded)} aria-expanded={mobileExpanded} aria-controls="device-connection-options" className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200 md:hidden">
          {mobileExpanded ? '閉じる' : '接続する'}
          <ChevronDown className={mobileExpanded ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'} />
        </button>
        <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <Wifi className="h-4 w-4 text-cyan-400" />
          デバイス管理
        </div>
      </div>

      <div id="device-connection-options" className={mobileExpanded ? 'block border-t border-white/10 p-4 pt-4 sm:p-5' : 'hidden border-t border-white/10 p-4 pt-4 sm:p-5 md:block'}>
        <div className="mb-4">
          <label htmlFor="input-protocol" className="mb-2 block text-xs font-semibold text-slate-300">入力プロトコル</label>
          <select id="input-protocol" value={selectedProtocol} onChange={e => setSelectedProtocol(e.target.value as InputProtocolType)} className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#0b1421] px-3 text-sm text-slate-100 outline-none focus:border-cyan-400 md:max-w-xl">
            <option value="SHOOTING_PLUS_V3">ShootingPlus V3 / BLE 16Byte</option>
            <option value="FLYDIGI_FLASHPLAY">Flydigi Flashplay / CapAir</option>
            <option value="GAMESIR_GTOUCH">GameSir G-Touch</option>
            <option value="STANDARD_GAMEPAD">標準 Gamepad API</option>
            <option value="KEYBOARD_MOUSE">キーボード / マウス</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <button type="button" disabled={connecting || !isBLESupported} onClick={handleBLEClick} className="group flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.07] p-3 text-left transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[108px] sm:p-4">
            <Bluetooth className="h-5 w-5 shrink-0 text-cyan-300" />
            <span className="text-sm font-bold text-white">Bluetooth</span>
            <span className="text-[11px] leading-snug text-slate-400">{isBLESupported ? 'BLEを探して接続' : 'この環境では非対応'}</span>
          </button>
          <button type="button" disabled={connecting || !isHIDSupported} onClick={handleHIDClick} className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] p-3 text-left transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[108px] sm:p-4">
            <Usb className="h-5 w-5 shrink-0 text-blue-300" />
            <span className="text-sm font-bold text-white">USB / HID</span>
            <span className="text-[11px] leading-snug text-slate-400">{isHIDSupported ? 'HIDデバイスを探す' : 'この環境では非対応'}</span>
          </button>
          <div className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:min-h-[108px] sm:p-4">
            <Gamepad2 className="h-5 w-5 shrink-0 text-emerald-300" />
            <span className="text-sm font-bold text-white">Gamepad API</span>
            <span className="text-[11px] leading-snug text-slate-400">OSペアリング済みを検知</span>
          </div>
          <button type="button" onClick={onSimulateVirtualDevice} className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-3 text-left transition hover:bg-violet-500/15 sm:min-h-[108px] sm:p-4">
            <Keyboard className="h-5 w-5 shrink-0 text-violet-300" />
            <span className="text-sm font-bold text-white">仮想テスト</span>
            <span className="text-[11px] leading-snug text-slate-400">デモ入力を追加</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div role="status" aria-live="polite" className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-[#0a1522] p-3 text-xs leading-relaxed text-slate-300 sm:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <span>{statusMessage}</span>
        </div>
      )}

      {connectedDevices.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">接続中のデバイス</p>
          <div className="grid gap-2 md:grid-cols-2">
            {connectedDevices.map(dev => (
              <div key={dev.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white">{dev.name}</div>
                  <div className="truncate text-[10px] text-slate-400">{dev.protocol} · {dev.type}{dev.battery !== undefined ? ' · ' + dev.battery + '%' : ''}</div>
                </div>
                <button type="button" onClick={() => onDisconnectDevice(dev.id)} className="min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold text-rose-300 hover:bg-rose-400/10">切断</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

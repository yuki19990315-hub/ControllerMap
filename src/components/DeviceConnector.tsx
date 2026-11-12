import React, { useState, useEffect } from 'react';
import { ConnectedDevice, InputProtocolType } from '../types/controller';
import { Bluetooth, Usb, Gamepad, Keyboard, Check, AlertCircle, Wifi, RefreshCw } from 'lucide-react';

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
  connectedDevices,
  onConnectBLE,
  onConnectHID,
  onDisconnectDevice,
  selectedProtocol,
  setSelectedProtocol,
  isBLESupported,
  isHIDSupported,
  onSimulateVirtualDevice,
}) => {
  const [connecting, setConnecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleBLEClick = async () => {
    setConnecting(true);
    setStatusMessage('Bluetooth LEデバイスをスキャン中...');
    try {
      await onConnectBLE();
      setStatusMessage('Bluetoothコントローラーに接続しました');
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setStatusMessage(`接続エラー: ${err.message || 'キャンセルまたは失敗'}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleHIDClick = async () => {
    setConnecting(true);
    setStatusMessage('WebHIDデバイスを検索中...');
    try {
      await onConnectHID();
      setStatusMessage('HIDデバイスに接続しました');
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setStatusMessage(`接続エラー: ${err.message || 'キャンセルまたは失敗'}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div>
          <span className="text-sm font-semibold text-white">デバイス接続 & 入力ソース設定</span>
          <p className="text-xs text-neutral-400">
            お使いのスマホ用Bluetoothコントローラー（ShootingPlus V3/Flydigi/GameSir）またはキーボード・マウスを接続
          </p>
        </div>

        {/* Protocol Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">プロトコル規格:</span>
          <select
            value={selectedProtocol}
            onChange={e => setSelectedProtocol(e.target.value as InputProtocolType)}
            className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-neutral-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="SHOOTING_PLUS_V3">ShootingPlus V3 (標準BLE 16Byte)</option>
            <option value="FLYDIGI_FLASHPLAY">Flydigi Flashplay / CapAir</option>
            <option value="GAMESIR_GTOUCH">GameSir G-Touch モード</option>
            <option value="STANDARD_GAMEPAD">標準 Gamepad API (USB/BT)</option>
            <option value="KEYBOARD_MOUSE">キーボード・マウス エミュレーション</option>
          </select>
        </div>
      </div>

      {/* Connection Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Web Bluetooth Button */}
        <button
          onClick={handleBLEClick}
          disabled={connecting || !isBLESupported}
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
            isBLESupported
              ? 'bg-neutral-950/70 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200'
              : 'bg-neutral-950/30 border-neutral-800/40 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 shrink-0">
            <Bluetooth className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">Web Bluetooth 接続</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              ShootingPlus V3 / Flydigi等のBLEコントローラーと直接ペアリング
            </p>
          </div>
        </button>

        {/* WebHID Button */}
        <button
          onClick={handleHIDClick}
          disabled={connecting || !isHIDSupported}
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
            isHIDSupported
              ? 'bg-neutral-950/70 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200'
              : 'bg-neutral-950/30 border-neutral-800/40 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40 shrink-0">
            <Usb className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">WebHID (USB/BT) 接続</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              USB接続または独自HIDデスクリプタ対応コントローラー
            </p>
          </div>
        </button>

        {/* Standard Gamepad API Status */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 text-left">
          <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shrink-0">
            <Gamepad className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">標準 Gamepad API</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              OSでペアリング済みのゲームパッドを自動常時検知
            </p>
          </div>
        </div>

        {/* Virtual Demo Controller */}
        <button
          onClick={onSimulateVirtualDevice}
          className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-all text-neutral-200"
        >
          <div className="p-2 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40 shrink-0">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">仮想テスト / WASD操作</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              実機コントローラーが手元にない時の即時キーボードテスト
            </p>
          </div>
        </button>
      </div>

      {/* Status banner if message present */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
          <Wifi className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Connected Devices List */}
      {connectedDevices.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-neutral-300">接続中のデバイス</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connectedDevices.map(dev => (
              <div
                key={dev.id}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/90 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="font-semibold text-white">{dev.name}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {dev.protocol} · {dev.type.toUpperCase()}
                      {dev.battery !== undefined && ` · バッテリー: ${dev.battery}%`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDisconnectDevice(dev.id)}
                  className="px-2.5 py-1 text-[11px] font-medium text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors"
                >
                  切断
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

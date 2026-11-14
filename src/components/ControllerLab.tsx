import React, { useEffect, useRef, useState } from 'react';
import { Activity, Bluetooth, CheckCircle2, CircleHelp, Clipboard, Fingerprint, Gamepad2, Layers3, ShieldCheck } from 'lucide-react';
import type { ConnectedDevice, GamepadState } from '../types/controller';
import { isNativeAndroid, nativeController } from '../utils/nativeController';
import type { NativePacket, SystemGamepad } from '../utils/nativeController';
import { uinputBridge } from '../utils/uinputBridge';
import type { UinputStatus } from '../utils/uinputBridge';

type ChangedByte = { index: number; before: number; after: number; xor: number; changedBits: number[] };
type Observation = { button: string; timestamp: number; characteristic: string; length: number; changes: ChangedByte[] };
const KEY = 'crosspad.button-learning.v1';
const BUTTONS = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2', 'L3', 'R3', '↑', '↓', '←', '→', 'SELECT', 'START', 'HOME'];

function loadObservations(): Observation[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((v): v is Observation => v && typeof v === 'object' && typeof v.button === 'string' && Array.isArray(v.changes)).slice(0, 100);
  } catch { return []; }
}
function changedBytes(before: number[], after: number[]): ChangedByte[] {
  return after.flatMap((value, index) => {
    const prev = before[index];
    if (prev === undefined || prev === value) return [];
    const xor = prev ^ value;
    return [{ index, before: prev, after: value, xor, changedBits: Array.from({ length: 8 }, (_, bit) => bit).filter(bit => (xor & (1 << bit)) !== 0) }];
  });
}
const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
const cap = (name: string) => name.length > 25 ? name.slice(0, 25) + '…' : name;
const statusText = (result: boolean, success: string, pending: string) => result ? success : pending;

export function ControllerLab({ devices, state }: { devices: ConnectedDevice[]; state: GamepadState }) {
  const [tab, setTab] = useState<'setup' | 'learn' | 'test'>('setup');
  const [frames, setFrames] = useState(0);
  const [lastFrame, setLastFrame] = useState<NativePacket | null>(null);
  const latestPacket = useRef<NativePacket | null>(null);
  const [frameAt, setFrameAt] = useState(0);
  const [gamepads, setGamepads] = useState<SystemGamepad[]>([]);
  const [shizuku, setShizuku] = useState<UinputStatus | null>(null);
  const [keepAlive, setKeepAlive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [button, setButton] = useState(BUTTONS[0]);
  const [baseline, setBaseline] = useState<NativePacket | null>(null);
  const [observations, setObservations] = useState<Observation[]>(loadObservations);
  const [learnNote, setLearnNote] = useState('V3の全ボタンを離した状態で「基準を記録」してください。');

  useEffect(() => {
    if (!isNativeAndroid) return;
    let disposed = false;
    let frameCount = 0;
    let lastUi = 0;
    let remove: (() => Promise<void>) | undefined;
    nativeController.addListener('packet', packet => {
      if (!Array.isArray(packet.bytes) || packet.bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) return;
      latestPacket.current = packet;
      frameCount += 1;
      if (Date.now() - lastUi > 160) {
        lastUi = Date.now();
        setFrames(frameCount);
        setLastFrame(packet);
        setFrameAt(Date.now());
      }
    }).then(handle => {
      if (disposed) void handle.remove();
      else remove = () => handle.remove();
    }).catch(err => console.warn('ControllerLab listener failed:', err));
    return () => { disposed = true; if (remove) void remove(); };
  }, []);

  const refreshStatus = async () => {
    if (!isNativeAndroid) { setNote('この診断はAndroid APK内で利用できます。'); return; }
    setBusy(true);
    try {
      const [input, service, keep] = await Promise.all([
        nativeController.systemGamepads(),
        uinputBridge.status(),
        nativeController.connectionKeepAliveStatus(),
      ]);
      setGamepads(input.devices);
      setShizuku(service);
      setKeepAlive(keep.active);
      setNote(input.devices.length ? 'AndroidのInputDeviceを再取得しました。名称・識別子を確認してください。' : 'Androidが列挙したゲームパッドはありません。');
    } catch (e: any) {
      setNote('状態確認エラー: ' + (e?.message || '不明'));
    } finally { setBusy(false); }
  };

  useEffect(() => { if (isNativeAndroid) void refreshStatus(); }, []);

  const toggleKeepAlive = async () => {
    setBusy(true);
    try {
      const result = await nativeController.setConnectionKeepAlive({ enabled: !keepAlive });
      setKeepAlive(result.active);
      setNote(result.active
        ? '接続保持サービスを開始しました。BLE接続の維持を補助しますが、バックグラウンドのDS4入力送信を保証しません。'
        : '接続保持サービスを停止しました。');
    } catch (e: any) {
      setNote('接続保持の開始に失敗: ' + (e?.message || 'BLE接続と権限を確認してください'));
    } finally { setBusy(false); }
  };

  const captureBaseline = () => {
    const packet = latestPacket.current;
    if (!packet) { setLearnNote('まだBLE通知データが届いていません。V3を接続してボタンを操作してください。'); return; }
    setBaseline({ ...packet, bytes: [...packet.bytes] });
    setLearnNote(button + 'を押し続けたまま「押下を記録」をタップしてください。');
  };

  const capturePress = () => {
    const after = latestPacket.current;
    if (!baseline || !after) { setLearnNote('先に基準を記録してください。'); return; }
    if (after.characteristic !== baseline.characteristic || after.bytes.length !== baseline.bytes.length) {
      setLearnNote('基準と同じ通知特性・同じ長さのパケットが必要です。取り直してください。'); return;
    }
    const changes = changedBytes(baseline.bytes, after.bytes);
    if (!changes.length) { setLearnNote('差分が見つかりません。ボタンを押したまま通知が来るか確認してください。'); return; }
    const observation: Observation = {
      button, timestamp: Date.now(), characteristic: after.characteristic, length: after.bytes.length, changes
    };
    const next = [...observations.filter(o => o.button !== button), observation].slice(-100);
    setObservations(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* display still works */ }
    setBaseline(null);
    const pos = BUTTONS.indexOf(button);
    setButton(BUTTONS[(pos + 1) % BUTTONS.length]);
    setLearnNote(button + 'の差分を保存しました。次のボタンではすべて離した状態から基準を取り直してください。');
  };

  const resetLearning = () => {
    setObservations([]);
    setBaseline(null);
    try { localStorage.removeItem(KEY); } catch { /* no storage */ }
    setLearnNote('記録を消去しました。');
  };

  const copyLearning = async () => {
    const data = JSON.stringify({ format: 'CrossPad V3 raw difference log', observations }, null, 2);
    try { await navigator.clipboard.writeText(data); setLearnNote('入力差分JSONをコピーしました。'); }
    catch { setLearnNote('コピーできませんでした。スクリーンショットで記録を共有してください。'); }
  };

  const bleConnected = devices.some(d => d.connected && d.type === 'ble');
  const nativeGamepadConnected = gamepads.some(d => !d.name.toLowerCase().includes('crosspad'));
  const virtualDetected = gamepads.some(d => d.name.toLowerCase().includes('crosspad'));
  const activeButtons = Object.entries(state.buttons)
    .filter(([key, value]) => key !== 'l2Value' && key !== 'r2Value' && value === true)
    .map(([name]) => name);
  return (
    <section className="space-y-4 rounded-[22px] border border-white/10 bg-[#121d2b]/90 p-4 shadow-xl sm:p-5" aria-label="V3接続診断">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Activity className="h-5 w-5"/></span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white">V3 接続・互換性ラボ</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">実機の状態を確認するための診断画面です。未確認の入力形式を自動でV3と断定しません。</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#091420] p-1" role="group" aria-label="診断画面切り替え">
        {([
          ['setup','接続診断',Bluetooth],
          ['learn','ボタン学習',Fingerprint],
          ['test','入力テスト',Gamepad2],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
            className={tab === id ? 'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-200' : 'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold text-slate-400'}>
            <Icon className="h-4 w-4"/>{label}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-300">実機チェックリスト</p>
          {[
            { name: '① BLEデバイスに接続', ok: bleConnected, detail: statusText(bleConnected, 'Bluetooth接続が一覧に登録されています', '入力デバイス → Bluetoothで検索・接続してください') },
            { name: '② 実際のBLE通知を受信', ok: frames > 0, detail: statusText(frames > 0, frames + '件の通知を受信（フォーマットは未検証）', 'V3のボタンを押して、受信件数が増えるか確認してください') },
            { name: '③ Android標準ゲームパッド', ok: nativeGamepadConnected, detail: statusText(nativeGamepadConnected, 'システムにゲームパッドとして認識された機器があります', '未確認。AndroidのBluetooth設定で直接ペアリングも試せます') },
            { name: '④ Shizuku仮想入力', ok: Boolean(shizuku?.virtualPadActive) && virtualDetected, detail: statusText(Boolean(shizuku?.virtualPadActive) && virtualDetected, 'CrossPad仮想入力がInputDevice一覧に見えています', '作成とOS認識を確認してください。DS4完全互換を意味しません') },
          ].map(item => (
            <div key={item.name} className="flex gap-3 rounded-xl border border-white/10 bg-[#0b1422] p-3">
              {item.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"/> : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"/>}
              <div className="min-w-0"><p className="text-xs font-bold text-white">{item.name}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p></div>
            </div>
          ))}
          <button type="button" onClick={() => void refreshStatus()} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-xs font-bold text-cyan-200">
            <Activity className="h-4 w-4"/>Android認識状態を更新
          </button>
          <div className="rounded-xl border border-white/10 bg-[#0b1422] p-3">
            <p className="text-xs font-bold text-white">通知付きBluetooth接続保持（試験機能）</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">接続後に有効化すると、AndroidのフォアグラウンドサービスでBLE接続の維持を補助します。ゲームへのDS4入力送信は別途検証が必要です。</p>
            <button type="button" onClick={() => void toggleKeepAlive()} disabled={busy || !isNativeAndroid}
              className={keepAlive ? 'mt-3 min-h-11 w-full rounded-xl border border-rose-400/30 bg-rose-400/10 text-xs font-bold text-rose-200' : 'mt-3 min-h-11 w-full rounded-xl bg-cyan-400 text-xs font-bold text-[#061320]'}>
              {keepAlive ? '接続保持を停止' : '接続保持を開始'}
            </button>
          </div>
        </div>
      )}
      {tab === 'learn' && (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">V3の物理ボタンごとに、離した状態と押した状態のBLEパケット差分を調べます。候補ビットの保存のみで、自動的に割り当てを確定しません。</p>
          <label className="block text-xs font-bold text-white" htmlFor="learn-target">調べるボタン</label>
          <select id="learn-target" value={button} onChange={e=>{setButton(e.target.value);setBaseline(null);}} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b1422] px-3 text-sm text-white">
            {BUTTONS.map(name=><option key={name} value={name}>{name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={captureBaseline} className="min-h-12 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200">1. 基準を記録（離す）</button>
            <button type="button" onClick={capturePress} disabled={!baseline} className="min-h-12 rounded-xl bg-cyan-400 px-3 text-xs font-bold text-[#061320] disabled:opacity-40">2. 押下を記録（押す）</button>
          </div>
          <p className="rounded-xl bg-[#091420] p-3 text-xs leading-relaxed text-slate-300" role="status">{learnNote}</p>
          <p className="text-xs font-bold text-white">解析メモ（{observations.length}ボタン）</p>
          {observations.length === 0 ? <p className="text-xs text-slate-500">まだ記録されていません。</p> : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {observations.map(item=>(
                <div key={item.button} className="rounded-xl border border-white/10 bg-[#0b1422] p-3 text-xs">
                  <p className="font-bold text-cyan-200">{item.button} <span className="font-normal text-slate-400">· {item.length} bytes</span></p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-300">{item.changes.map(c=>'byte['+c.index+'] '+hex(c.before)+' → '+hex(c.after)+' (bit '+c.changedBits.join(',')+')').join(' / ')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyLearning()} disabled={!observations.length} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"><Clipboard className="h-4 w-4"/>差分JSONをコピー</button>
            <button type="button" onClick={resetLearning} disabled={!observations.length} className="min-h-10 rounded-xl border border-rose-400/20 px-3 text-xs text-rose-300 disabled:opacity-50">学習記録を消去</button>
          </div>
        </div>
      )}
      {tab === 'test' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1422] p-3"><p className="text-[11px] text-slate-400">BLE通知件数</p><p className="mt-1 font-mono text-xl font-bold text-cyan-200">{frames}</p></div>
            <div className="rounded-xl border border-white/10 bg-[#0b1422] p-3"><p className="text-[11px] text-slate-400">最終通知</p><p className="mt-1 text-sm font-bold text-white">{frameAt ? new Date(frameAt).toLocaleTimeString('ja-JP') : '未受信'}</p></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1422] p-3 text-xs">
            <p className="mb-1 font-bold text-white">直近のBLEパケット</p>
            <p className="break-all font-mono text-[11px] leading-relaxed text-slate-300">{lastFrame ? lastFrame.bytes.map(hex).join(' ') : '未受信'}</p>
            {lastFrame && <p className="mt-1 break-all text-[11px] text-slate-500">{lastFrame.characteristic} / {lastFrame.bytes.length} bytes</p>}
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1422] p-3 text-xs">
            <p className="font-bold text-white">アプリ内のボタン状態</p>
            <p className="mt-2 break-words font-mono text-cyan-200">{activeButtons.length ? activeButtons.join(' / ') : '押下なし'}</p>
            <p className="mt-2 font-mono text-slate-300">L X: {state.leftStick.x.toFixed(2)} / Y: {state.leftStick.y.toFixed(2)}</p>
            <p className="font-mono text-slate-300">R X: {state.rightStick.x.toFixed(2)} / Y: {state.rightStick.y.toFixed(2)}</p>
          </div>
          <p className="text-xs font-bold text-white">Android InputDevice一覧</p>
          <button type="button" disabled={busy} onClick={() => void refreshStatus()} className="min-h-11 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 text-xs font-semibold text-cyan-200">デバイス一覧を更新</button>
          {gamepads.length === 0 ? <p className="text-xs text-slate-400">ゲームパッドは未検出です。</p> : gamepads.map(g=>(
            <div key={g.id} className="rounded-xl border border-white/10 bg-[#0b1422] p-3 text-xs">
              <p className="font-bold text-white">{cap(g.name)}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">ID {g.id} / VID {g.vendorId} / PID {g.productId}</p>
              {g.vendorId === 0x054C && <p className="mt-1 text-[11px] text-amber-200">SonyのVIDが設定されています（実機・完全互換の証明ではありません）</p>}
            </div>
          ))}
          {shizuku && <p className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4"/>Shizuku: {shizuku.shizukuRunning ? '起動中' : '停止中'} / 仮想入力: {shizuku.virtualPadActive ? '起動要求済み' : '停止中'}</p>}
        </div>
      )}
      {note && <p role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-[#0b1422] p-3 text-xs leading-relaxed text-slate-300">{note}</p>}
      <p className="text-[11px] leading-relaxed text-slate-500">診断結果はあくまでこのアプリとAndroidの認識状態です。ゲームごとの動作やDUALSHOCK 4完全互換は実機試験が必要です。</p>
    </section>
  );
}

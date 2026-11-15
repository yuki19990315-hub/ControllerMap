import { useCallback, useEffect, useState } from 'react';
import { Bluetooth, CheckCircle2, Gamepad2, RefreshCw, ShieldAlert } from 'lucide-react';
import { isNativeAndroid } from '../utils/nativeController';
import { uinputBridge } from '../utils/uinputBridge';
import type { JoyConMergeStatus, UinputStatus } from '../utils/uinputBridge';

export function JoyConMergePanel({ onMergeChange }: { onMergeChange?: () => void }) {
  const [shizuku, setShizuku] = useState<UinputStatus | null>(null);
  const [merge, setMerge] = useState<JoyConMergeStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('Joy-Conを2本ともAndroidのBluetooth設定でペアリングしてください。');

  const refresh = useCallback(async (probe: boolean) => {
    if (!isNativeAndroid) return;
    const status = await uinputBridge.status();
    setShizuku(status);
    if (!status.shizukuRunning || !status.authorized) return;
    const response = probe ? await uinputBridge.joyConProbe() : await uinputBridge.joyConStatus();
    setMerge(response.status);
  }, []);

  useEffect(() => {
    if (!isNativeAndroid) return;
    void refresh(true).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!merge?.active) return;
    const timer = window.setInterval(() => void refresh(false).catch(() => {}), 2500);
    return () => window.clearInterval(timer);
  }, [merge?.active, refresh]);

  const run = async (action: 'authorize' | 'probe' | 'start' | 'stop') => {
    setWorking(true);
    try {
      if (action === 'authorize') {
        await uinputBridge.authorize();
        setMessage('Shizukuの権限を許可しました。次は「左右を検出」してください。');
        await refresh(true);
        return;
      }
      const result = action === 'probe' ? await uinputBridge.joyConProbe()
        : action === 'start' ? await uinputBridge.joyConStart()
          : await uinputBridge.joyConStop();
      setMerge(result.status);
      setMessage(result.status.message || '操作が完了しました。');
      if (action === 'start' || action === 'stop') onMergeChange?.();
    } catch (error: any) {
      setMessage(`操作に失敗: ${error?.message || '不明なエラー'}`);
    } finally {
      setWorking(false);
    }
  };

  if (!isNativeAndroid) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-violet-400/25 bg-violet-400/[0.055] p-4 text-xs" aria-label="Joy-Con左右統合">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-violet-300" />
          <div>
            <p className="text-sm font-bold text-white">Switch 1 Joy-Con 左右統合</p>
            <p className="mt-1 text-slate-400">L + R → 1個のAndroidゲームパッド（root不要・Shizuku使用）</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 font-bold ${merge?.active ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>
          {merge?.active ? '統合中' : '未起動'}
        </span>
      </div>

      <div className="rounded-xl bg-black/20 p-3 text-slate-300">
        <p className="flex items-center gap-2 font-semibold"><Bluetooth className="h-4 w-4 text-cyan-300"/>最初に左右のSYNCボタンでAndroidのBluetooth設定に接続</p>
        <p className="mt-2 text-slate-400">「Joy-Con (L)」「Joy-Con (R)」を2本とも接続 → Shizukuを起動して権限許可 → 左右を検出 → 統合開始。</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 p-2 text-slate-300">Shizuku: <strong className={shizuku?.shizukuRunning ? 'text-emerald-300' : 'text-amber-300'}>{shizuku?.shizukuRunning ? '起動中' : '未起動'}</strong></div>
        <div className="rounded-lg border border-white/10 p-2 text-slate-300">L: <strong className={merge?.leftConnected ? 'text-emerald-300' : 'text-amber-300'}>{merge?.leftConnected ? '検出' : '未検出'}</strong></div>
        <div className="rounded-lg border border-white/10 p-2 text-slate-300">R: <strong className={merge?.rightConnected ? 'text-emerald-300' : 'text-amber-300'}>{merge?.rightConnected ? '検出' : '未検出'}</strong></div>
        <div className="rounded-lg border border-white/10 p-2 text-slate-300">uinput: <strong className={merge?.uinputWritable ? 'text-emerald-300' : 'text-amber-300'}>{merge?.uinputWritable ? '使用可能' : '未確認/不可'}</strong></div>
        <div className="rounded-lg border border-white/10 p-2 text-slate-300">Shizuku権限: <strong className={shizuku?.authorized ? 'text-emerald-300' : 'text-amber-300'}>{shizuku?.authorized ? '許可済み' : '未許可'}</strong></div>
        {merge?.active && <div className="rounded-lg border border-white/10 p-2 text-slate-300">入力送信: <strong className="text-cyan-300">{merge.reports ?? 0}回</strong></div>}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 font-semibold text-white disabled:opacity-40" disabled={working} onClick={() => void refresh(true).then(() => setMessage('状態を更新しました')).catch((e: Error) => setMessage(e.message))}>
          <RefreshCw className="mr-1 inline-block h-4 w-4"/>状態を更新
        </button>
        <button type="button" className="min-h-11 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 font-semibold text-cyan-300 disabled:opacity-40" disabled={working || !shizuku?.shizukuRunning || shizuku?.authorized} onClick={() => void run('authorize')}>Shizuku権限許可</button>
        <button type="button" className="min-h-11 rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 font-semibold text-violet-200 disabled:opacity-40" disabled={working || !shizuku?.authorized} onClick={() => void run('probe')}>左右を検出</button>
        {merge?.active ? (
          <button type="button" className="min-h-11 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 font-bold text-rose-300 disabled:opacity-40" disabled={working} onClick={() => void run('stop')}>統合を停止</button>
        ) : (
          <button type="button" className="min-h-11 rounded-xl bg-violet-400 px-3 font-bold text-[#120a23] disabled:opacity-40" disabled={working || !shizuku?.authorized || !merge?.supported} onClick={() => void run('start')}>Joy-Con統合開始</button>
        )}
      </div>

      <p role="status" aria-live="polite" className="break-words rounded-lg border border-white/10 bg-[#0b1422] p-3 text-slate-200">
        {merge?.active ? <CheckCircle2 className="mr-1 inline-block h-4 w-4 text-emerald-300"/> : <ShieldAlert className="mr-1 inline-block h-4 w-4 text-amber-300"/>}
        {message}
      </p>
      <p className="text-[11px] leading-relaxed text-slate-400">
        実験機能。Joy-Con純正の識別子（057e:2006/2007）に対応。端末のSELinux設定やドライバー次第で動かない場合があります。実機の入力マッピングとWarframe側の認識は未検証です。ゲーム中は通知が表示されます。終わったら「統合を停止」を押してください。
      </p>
    </section>
  );
}

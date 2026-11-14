import React, { useState } from 'react';
import { Save, FolderOpen, Trash2, Gamepad2, RotateCcw } from 'lucide-react';
import type { MappingProfile } from '../types/controller';
import { PRESET_PROFILES } from '../utils/presets';

interface Props {
  current: MappingProfile;
  saved: MappingProfile[];
  onApply: (profile: MappingProfile) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
}

const short = (value: string) => value.trim().slice(0, 48);

export function GameProfiles({ current, saved, onApply, onSave, onRemove }: Props) {
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const isStored = saved.some(p => p.id === current.id);
  return (
    <section className="rounded-[22px] border border-white/10 bg-[#121d2b]/90 p-4 shadow-xl sm:p-5" aria-label="ゲーム別プロファイル">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><FolderOpen className="h-5 w-5"/></span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white">ゲーム別プロファイル</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">ボタン配置・感度・マッピングを端末内に保存し、ゲームごとに切り替えます。ゲーム起動を検出して自動切替する機能ではありません。</p>
        </div>
      </div>
      <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">使用中の設定</p>
        <p className="mt-1 truncate text-sm font-bold text-white">{current.name}</p>
        <p className="mt-1 text-[11px] text-slate-400">{isStored ? '保存済みの設定。変更内容は「現在の設定を保存」を押すまで確定しません。' : 'プリセットまたは未保存の設定'}</p>
      </div>
      <form onSubmit={event => { event.preventDefault(); if (short(newName)) { onSave(short(newName)); setNewName(''); } }} className="flex flex-col gap-2 min-[400px]:flex-row">
        <label className="sr-only" htmlFor="game-profile-name">ゲームの名前</label>
        <input id="game-profile-name" value={newName} onChange={e => setNewName(e.target.value)} maxLength={48} placeholder={isStored ? '保存名（変更すると新規保存）' : '例：マインクラフト'} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1422] px-3 text-sm text-white outline-none focus:border-cyan-400"/>
        <button type="submit" disabled={!short(newName)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-[#071321] disabled:opacity-40"><Save className="h-4 w-4"/>名前を付けて保存</button>
      </form>
      {isStored && (
        <button type="button" onClick={() => onSave(current.name)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-xs font-semibold text-cyan-200">
          <Save className="h-4 w-4"/>現在の設定を上書き保存
        </button>
      )}
      <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">保存済み（{saved.length}件）</p>
      {saved.length === 0 && <p className="mb-3 text-xs text-slate-500">まだ保存されていません。最初に設定名を入力してください。</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {saved.map(p => (
          <div key={p.id} className={p.id === current.id ? 'flex min-w-0 items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-400/[0.07] p-2.5' : 'flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-[#0b1422] p-2.5'}>
            <button type="button" onClick={() => onApply(p)} className="min-h-11 min-w-0 flex-1 text-left" aria-label={p.name + 'を読み込む'}>
              <p className="truncate text-xs font-bold text-white">{p.name}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{p.id === current.id ? '選択中' : '読み込む'}</p>
            </button>
            {confirmDelete === p.id ? (
              <>
                <button type="button" onClick={() => {onRemove(p.id);setConfirmDelete(null);}} className="min-h-10 shrink-0 rounded-lg px-2 text-xs font-bold text-rose-300">削除する</button>
                <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-10 shrink-0 rounded-lg px-2 text-xs text-slate-300">戻る</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(p.id)} aria-label={p.name + 'を削除'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-4 w-4"/></button>
            )}
          </div>
        ))}
      </div>
      <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">初期プリセット</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_PROFILES.map(p => (
          <button key={p.id} type="button" onClick={() => onApply(p)} className={p.id === current.id ? 'min-h-10 rounded-xl border border-violet-400/40 bg-violet-400/15 px-3 text-xs font-bold text-violet-200' : 'min-h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300'}>
            {p.name}
          </button>
        ))}
        <button type="button" onClick={() => onApply(PRESET_PROFILES[0])} className="flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-xs font-semibold text-slate-300"><RotateCcw className="h-3.5 w-3.5"/>初期設定</button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">保存先はこのアプリのローカルストレージです。再インストールやアプリデータ削除で消える場合があります。</p>
    </section>
  );
}

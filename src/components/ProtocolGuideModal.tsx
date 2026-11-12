import React from 'react';
import { X, BookOpen, Layers, Cpu, Bluetooth, CheckCircle2 } from 'lucide-react';

interface ProtocolGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtocolGuideModal: React.FC<ProtocolGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                スマホ画面マッピング式コントローラーの変換仕組みと構成ガイド
              </h2>
              <p className="text-xs text-neutral-400">
                ShootingPlus V3 / Flydigi / GameSir を DUALSHOCK 4 & Switch Pro に変換する技術アーキテクチャ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-300 text-xs leading-relaxed">
          {/* Section 1: The Problem */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              1. なぜ通常のPCや家庭用ゲーム機でそのまま使えないのか？
            </h3>
            <p>
              多くのスマートフォン用Bluetoothコントローラー（Ipega、Mocute、Flydigi、GameSirなど）は、標準的なコントローラー規格（XInput / DirectInput / DUALSHOCK HID）ではなく、
              <strong className="text-white">「画面マッピングモード（ShootingPlus V3モードやFlashplayモード）」</strong>で動作しています。
            </p>
            <p className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-neutral-400">
              このモードでは、スティックやボタンを押すと「画面のX, Y座標をタッチした」という独自のBLE（Bluetooth Low Energy）カスタムパケット、または疑似マウス/キーボード入力が送信されます。そのため、PCゲーム（Steam、原神PC版等）やPS Remote Play、Switch本体はこれを正規のコントローラーとして認識できません。
            </p>
          </section>

          {/* Section 2: How CrossPad Solves It */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              2. CrossPad による変換パイプライン
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Bluetooth className="h-4 w-4 text-emerald-400" />
                  <span>① 入力パケット吸い出し</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Web Bluetooth APIまたはESP32/PCドライバ経由で、コントローラーが発する16バイトのGATT通知（B4〜B7のスティック軸、B8〜B9のボタンマスク）を受信・リアルタイムデコード。
                </p>
              </div>

              <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>② 座標・スティック再正規化</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  画面の仮想ジョイスティックやタッチ座標を、-1.0〜+1.0のアナログスティック値に変換。不感帯（デッドゾーン）やレスポンスカーブ、アンチデッドゾーンを適用。
                </p>
              </div>

              <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-rose-400" />
                  <span>③ DUALSHOCK / Switch 生成</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Sony DUALSHOCK 4規格（Report ID 0x01、64バイトHID）またはNintendo Switch Pro規格（Subcommand 0x30、12bitパックスティック）を組み立ててOSに送出。
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Recommended Setups */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              3. おすすめの実機連携方法
            </h3>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">方法A：Windows PC 仮想ブリッジ (ViGEmBus) 【最も手軽・無料】</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    「ブリッジ出力」タブから生成できるPythonスクリプトを使用。Windows公式推奨のViGEmBusドライバ経由で、OSのデバイスマネージャーに本物の「Sony DUALSHOCK 4」が瞬時に現れます。Steam、PS Remote Play、エミュレーター全てで完璧に動作します。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">方法B：ESP32 ハードウェアドングル 【PC不要・Switch実機/PS4本体に直挿し】</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    数百円で購入できるマイコン「ESP32-S3」に付属のC++コードを書き込むだけ。ESP32がスマホコントローラーとBluetooth接続し、Nintendo SwitchドックやPS4のUSBポートに挿すだけで本物の有線コントローラーとして認識されます。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Compatibility */}
          <section className="space-y-2 pt-2 border-t border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-300">対応コントローラー規格</h3>
            <div className="flex flex-wrap gap-2 text-[11px] text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">ShootingPlus V3 対応機 (Ipega 9083S, 9167等)</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">Mocute 054 / 058 / 060</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">Flydigi Wee 2T / Apex (Flashplay)</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">GameSir G6 / X2 (G-Touch)</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">ShanWan / Saitake</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">標準WebHID / Gamepad API コントローラー</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  X,
  Smartphone,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Terminal,
  Zap,
  CheckCircle2,
  QrCode as QrCodeIcon,
  HelpCircle,
  FileArchive,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface AndroidPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const AndroidPackageModal: React.FC<AndroidPackageModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwabuilder' | 'pwa_direct' | 'capacitor'>('pwabuilder');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const PUBLIC_APP_URL = 'https://ais-pre-uznswuh4lwojppne74lhr7-511323087849.asia-east1.run.app';
  const currentUrl = PUBLIC_APP_URL;

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Android APK化 & スマホ導入ガイド</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  図解解説付き
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                PWABuilderによるAPKファイル生成、またはスマホへの直接インストール手順
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

        {/* Troubleshooting & Fix Notice */}
        <div className="px-6 py-3.5 bg-amber-950/40 border-b border-amber-800/50 text-xs text-amber-200 space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-100">
                【重要】インストールやPWABuilderがエラーになった原因と解決策
              </p>
              <p className="text-amber-300 text-[11px] leading-relaxed">
                AI Studioのプレビュー画面は<strong>Googleアカウント保護（Cookie認証）</strong>がかかっているため、
                画面右上の <strong className="text-white underline">「Share（共有）」ボタン</strong> を押してリンク公開を有効にしないと、PWABuilderやスマホの外部ブラウザがGoogleのログイン画面に弾かれてしまいます。
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-sans text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold">
                  ✓ サーバー側 /sw.js & /manifest.json の配信設定を完全修復済
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-semibold">
                  👉 AI Studio右上の「Share」を押せば即開通します
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Method Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/60 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('pwabuilder')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pwabuilder'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>【方法1】PWABuilderでAPKを落とす手順</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa_direct')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pwa_direct'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <QrCodeIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span>【方法2】QRコードでスマホに直接入れる（超簡単）</span>
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'capacitor'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-neutral-400" />
            <span>【方法3】Capacitor (Android Studio)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-300 leading-relaxed">
          {/* METHOD 1: PWABuilder Detailed Walkthrough */}
          {activeTab === 'pwabuilder' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-200">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      PWABuilderで「.apkファイル」をダウンロードする完全手順
                    </h3>
                    <p className="mt-1 text-neutral-300 text-xs">
                      PWABuilder（Microsoft/Google公式仕様）は、WebサイトのURLを入力するだけでAndroid用APKを無料で自動生成してくれる公式Webサービスです。
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Steps Visual */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                      1
                    </span>
                    <span>下のURLをコピーする</span>
                  </div>
                  <p className="text-neutral-400 text-xs">
                    PWABuilderに入力するためのアプリURLです。「URLをコピー」ボタンを押してください。
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-indigo-300 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition-colors shrink-0"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedUrl ? 'コピー完了！' : 'URLをコピー'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                      2
                    </span>
                    <span>PWABuilderのサイトを開き、貼り付けて「Start」を押す</span>
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    下のボタンを押すと別タブでPWABuilderが開きます。入力欄にコピーしたURLを貼り付け、紫色の「<strong>Start</strong>」ボタンをクリックしてください。
                  </p>
                  <div className="pt-1">
                    <a
                      href={`https://www.pwabuilder.com/?url=${encodeURIComponent(currentUrl)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-semibold transition-colors"
                    >
                      <span>PWABuilder サイトを開く (pwabuilder.com)</span>
                      <ExternalLink className="h-4 w-4 text-indigo-400" />
                    </a>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800/80 text-[11px] font-mono text-neutral-400">
                    画面の見た目: [ https://ais-pre-... ] <span className="text-indigo-400 font-bold">[ Start ]</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                      3
                    </span>
                    <span>「Package for Stores」画面で Android の「Package」を押す</span>
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    サイトの解析が完了すると、画面上部に「<strong>Package for Stores</strong>」というボタンが表示されます（または下部に「Android」カードが出ます）。
                    そこにある <strong className="text-emerald-400">「Package」</strong> または <strong className="text-emerald-400">「Generate」</strong> ボタンをクリックします。
                  </p>
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <span>Android カード内のボタン:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-xs">Package</span>
                    </div>
                    <p className="text-neutral-500">※設定ウィンドウが出ますが、アイコンや設定は既にアプリ側で完了しているため、そのまま右下の「<strong>Download Package</strong>」を押せばOKです。</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      4
                    </span>
                    <span>ダウンロードされたzipを展開すると「.apk」が入っています</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <FolderOpen className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-neutral-300">
                      <p className="font-semibold text-white">ZIPファイルの中身について：</p>
                      <p className="text-neutral-400">
                        ダウンロードされた <code className="text-indigo-300">android.zip</code> を展開（解凍）すると、フォルダの中に <strong className="text-emerald-400 font-mono">app-release-signed.apk</strong>（または <code className="text-emerald-400 font-mono">app-debug.apk</code>）が入っています。
                      </p>
                      <p className="text-neutral-400">
                        この <code className="text-emerald-300 font-mono">.apk</code> ファイルをスマホに送信（GoogleドライブやUSB経由）してタップすればインストールできます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* METHOD 2: Direct QR code & Chrome Install */}
          {activeTab === 'pwa_direct' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200">
                <div className="flex items-start gap-3">
                  <QrCodeIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      最も簡単！スマホのカメラでQRコードを読み取るだけ（APK不要）
                    </h3>
                    <p className="mt-1 text-neutral-300 text-xs">
                      「スマホにアプリとして入れてShootingPlus V3を使いたい」だけであれば、APKを作らなくてもスマホのChromeから10秒でホーム画面にアプリ化できます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* QR Code Display */}
                <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
                  <div className="p-3 bg-white rounded-xl shadow-lg">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="App URL QR Code" className="w-40 h-40" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-neutral-400 font-mono text-xs">
                        QR生成中...
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-semibold text-xs flex items-center justify-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-emerald-400" />
                      <span>スマホのカメラでスキャン</span>
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      スマホの通常カメラをかざすとリンクが開きます
                    </p>
                  </div>
                </div>

                {/* 3 Step Instructions */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">スマホでの操作手順（10秒）：</h4>
                  
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0">
                      1
                    </span>
                    <p className="text-xs text-neutral-300">
                      スマホのカメラで左のQRコードを読み取り、<strong>Chromeブラウザ</strong>で開く
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0">
                      2
                    </span>
                    <p className="text-xs text-neutral-300">
                      画面右上メニュー「<strong>︙</strong>」をタップし、<strong className="text-white">「アプリをインストール」</strong>（または「ホーム画面に追加」）を選択
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0">
                      3
                    </span>
                    <p className="text-xs text-neutral-300">
                      ホーム画面に「CrossPad」アイコンが追加され、<strong>URLバーのない全画面ネイティブアプリ</strong>として起動します！
                    </p>
                  </div>
                </div>
              </div>

              {/* In-browser install button if currently on Android browser */}
              {isInstallable && (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white text-sm">この端末に直接インストール可能</p>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      現在このブラウザ上で直接インストールが可能です。下のボタンを押してください。
                    </p>
                  </div>
                  <button
                    onClick={install}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors shrink-0"
                  >
                    今すぐインストール
                  </button>
                </div>
              )}
            </div>
          )}

          {/* METHOD 3: Capacitor Android Studio */}
          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Capacitor による Android Studio プロジェクト作成</h3>
                </div>
                <p className="text-[11px] text-neutral-400">
                  PCのローカル環境にコードをダウンロードし、Android Studioを使ってソースコードから直接デバッグ用APKをコンパイルする場合の手順です。
                </p>

                <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-3 font-mono text-[11px] text-neutral-300 space-y-1.5 overflow-x-auto">
                  <div className="text-neutral-500"># 1. Capacitorの依存関係をインストール</div>
                  <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                  <div className="text-neutral-500 pt-1"># 2. Capacitorプロジェクト初期化</div>
                  <div>npx cap init CrossPad com.crosspad.controller --web-dir dist</div>
                  <div className="text-neutral-500 pt-1"># 3. WebアセットをビルドしてAndroidフォルダを生成</div>
                  <div>npm run build</div>
                  <div>npx cap add android</div>
                  <div className="text-neutral-500 pt-1"># 4. Android Studioで開く（メニューの Build &gt; Build APK で出力）</div>
                  <div>npx cap open android</div>
                </div>
              </div>
            </div>
          )}

          {/* Technical Note on Android Accessibility Overlay */}
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <span className="font-semibold text-neutral-200">
                ShootingPlus V3 の Android 画面オーバーレイに関する補足
              </span>
              <p className="text-neutral-400 leading-relaxed">
                ShootingPlus V3コントローラーを「スマホ内で起動している別ゲーム（原神スマホ版など）の画面の上に重ねてタッチ操作する」目的の場合、Android OSの「ユーザー補助サービス（Accessibility Service）」や「他のアプリの上に重ねて描画する権限」が必要です。
                本アプリは【スマホコントローラーの入力をDUALSHOCK 4やSwitch Proコントローラーの標準信号にリアルタイム変換し、PCゲームやPS4/Switch本体、クラウドゲームで遊べるようにする】用途に完全最適化されています。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 font-mono">PWA / TWA Android Package Ready</span>
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

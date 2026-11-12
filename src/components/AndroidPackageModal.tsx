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
  GitBranch,
  Github,
  Box,
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
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);
  const [activeTab, setActiveTab] = useState<'github' | 'pwabuilder' | 'pwa_direct' | 'capacitor'>('github');
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

  const gitPushCommand = `git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git\ngit branch -M main\ngit push -u origin main`;

  const handleCopyGitCmd = () => {
    navigator.clipboard.writeText(gitPushCommand);
    setCopiedGitCmd(true);
    setTimeout(() => setCopiedGitCmd(false), 2000);
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
                <span>Android APK化 & GitHub 自動ビルド</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  GitHub Actions内蔵
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                GitHubでのAPK自動ビルド（推奨）、PWABuilder、またはスマホ直接インストール
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

        {/* Method Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/60 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('github')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Github className="h-3.5 w-3.5 text-white" />
            <span>【最確実】GitHub Actions でAPK自動生成</span>
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
            <span>【簡単】スマホに直接追加 (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('pwabuilder')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pwabuilder'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>PWABuilder でAPK生成</span>
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
            <span>Capacitor コマンド</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-300 leading-relaxed">
          {/* METHOD: GITHUB ACTIONS (NEW & PRIMARY) */}
          {activeTab === 'github' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-200 space-y-2">
                <div className="flex items-start gap-3">
                  <Github className="h-5 w-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      GitHubリポジトリ & Android APK自動ビルド（設定完了済み）
                    </h3>
                    <p className="mt-1 text-neutral-300 text-xs leading-relaxed">
                      リポジトリ内に <strong className="text-white">GitHub Actions 自動ビルドスクリプト（.github/workflows/build-apk.yml）</strong> と、Android Studio プロジェクト一式（Capacitor Native）を完全構築しました。
                      GitHubに上げるだけで、GitHubのクラウドサーバーが自動でAndroid SDKを起動して <strong>app-debug.apk</strong> をビルド・配布します。
                    </p>
                  </div>
                </div>

                {/* Big Download Button */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="/crosspad-repository.zip"
                    download="crosspad-repository.zip"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>📦 プロジェクト一式をダウンロード (crosspad-repository.zip)</span>
                  </a>
                  <span className="text-[11px] text-neutral-400">
                    ※Androidネイティブコード + APK自動生成ワークフロー内蔵 (約400KB)
                  </span>
                </div>
              </div>

              {/* 3 Simple Steps */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">GitHubでAPKを手に入れる3ステップ：</h4>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                    1
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-white">GitHubで新しいリポジトリを作成する</p>
                    <p className="text-neutral-400 text-xs">
                      ブラウザで <a href="https://github.com/new" target="_blank" rel="noreferrer noopener" className="text-indigo-400 underline inline-flex items-center gap-0.5">github.com/new <ExternalLink className="h-3 w-3" /></a> を開き、リポジトリ名（例: <code>crosspad</code>）を入力して「Create repository」をクリック。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                    2
                  </span>
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-white">ファイルをアップロード（または Git Push）</p>
                    <p className="text-neutral-400 text-xs">
                      上のボタンでダウンロードした <code>crosspad-repository.zip</code> を解凍し、GitHub画面の「uploading an existing file」から全ファイルをドラッグ＆ドロップしてコミットします。
                    </p>
                    <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                        <span>コマンドでPushする場合:</span>
                        <button
                          onClick={handleCopyGitCmd}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          {copiedGitCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedGitCmd ? 'コピー済' : 'コマンドをコピー'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[10px] text-neutral-300 whitespace-pre-wrap">{gitPushCommand}</pre>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0">
                    3
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-white">GitHub Actions で APK をダウンロード！</p>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      Push後、GitHubリポジトリの <strong className="text-white">「Actions」タブ</strong> を開くと、<code>Build & Package Android APK</code> が自動で実行されます。
                      約1〜2分でビルドが完了し、成果物（<strong>Artifacts</strong>）または <strong>「Releases」</strong> に <strong className="text-emerald-400 font-mono">app-debug.apk</strong> が配置され、ワンクリックでダウンロードできます！
                    </p>
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

          {/* METHOD 3: PWABUILDER */}
          {activeTab === 'pwabuilder' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-200">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      PWABuilderで「.apkファイル」をダウンロードする手順
                    </h3>
                    <p className="mt-1 text-neutral-300 text-xs">
                      ※AI Studioの右上の「Share（共有）」をONにすることで、PWABuilderのロボットがサイトを正常に読み込めるようになります。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <p className="font-semibold text-white text-xs">URLのコピー & PWABuilderへのアクセス:</p>
                  <div className="flex items-center gap-2">
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
                      <span>{copiedUrl ? 'コピー済' : 'URLをコピー'}</span>
                    </button>
                  </div>
                  <div className="pt-2">
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
                </div>
              </div>
            </div>
          )}

          {/* METHOD 4: Capacitor Android Studio */}
          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Android Studio での直接ビルド</h3>
                </div>
                <p className="text-[11px] text-neutral-400">
                  既にプロジェクト直下に <code>android/</code> フォルダ（Gradle Androidプロジェクト一式）が生成されています。
                </p>

                <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-3 font-mono text-[11px] text-neutral-300 space-y-1.5 overflow-x-auto">
                  <div className="text-neutral-500"># Android Studioで開く</div>
                  <div>npx cap open android</div>
                  <div className="text-neutral-500 pt-1"># またはコマンドラインでAPKビルド</div>
                  <div>cd android && ./gradlew assembleDebug</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 font-mono">CrossPad v1.0 · Android APK Builder</span>
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

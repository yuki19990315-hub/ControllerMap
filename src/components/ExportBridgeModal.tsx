import React, { useState } from 'react';
import { MappingProfile, TargetControllerType } from '../types/controller';
import { generatePythonViGEmScript, generateESP32HardwareFirmware } from '../utils/codeGenerators';
import { X, Copy, Check, Download, Terminal, Cpu, FileJson, ExternalLink } from 'lucide-react';

interface ExportBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MappingProfile;
  targetController: TargetControllerType;
}

export const ExportBridgeModal: React.FC<ExportBridgeModalProps> = ({
  isOpen,
  onClose,
  profile,
  targetController,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'python' | 'esp32' | 'json'>('python');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const pythonScript = generatePythonViGEmScript(profile, targetController);
  const esp32Code = generateESP32HardwareFirmware(profile, targetController);
  const profileJson = JSON.stringify(profile, null, 2);

  const currentCode =
    activeSubTab === 'python'
      ? pythonScript
      : activeSubTab === 'esp32'
      ? esp32Code
      : profileJson;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      activeSubTab === 'python'
        ? `crosspad_bridge_${targetController.toLowerCase()}.py`
        : activeSubTab === 'esp32'
        ? `crosspad_esp32_${targetController.toLowerCase()}.ino`
        : `crosspad_profile_${profile.id}.json`;

    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                実機連携ブリッジ & コードエクスポート
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>ターゲット: {targetController === 'DS4' ? 'Sony DUALSHOCK 4' : 'Nintendo Switch Pro'}</span>
                <span aria-hidden="true">·</span>
                <span>設定プロファイル: {profile.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-2.5 bg-neutral-900/50">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setActiveSubTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'python'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Windows PC 仮想コントローラー (ViGEm Python)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('esp32')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'esp32'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>ESP32 ハードウェア USBドングル (C++)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'json'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>プロファイル JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'コピー完了' : 'コードをコピー'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ダウンロード</span>
            </button>
          </div>
        </div>

        {/* Code Viewport */}
        <div className="flex-1 overflow-auto p-6 bg-neutral-950 font-mono text-xs text-neutral-300">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">
            {currentCode}
          </pre>
        </div>

        {/* Instructions Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/60 text-xs text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {activeSubTab === 'python' ? (
            <div>
              <p className="text-white font-medium mb-0.5">使い方 (Windows):</p>
              <p>
                1. <code className="text-indigo-400">pip install vgamepad websockets</code> を実行
                · 2. スクリプトを起動するとOS上に本物の仮想コントローラーが生成されます。
              </p>
            </div>
          ) : activeSubTab === 'esp32' ? (
            <div>
              <p className="text-white font-medium mb-0.5">ESP32 書き込み手順:</p>
              <p>
                ESP32-S3またはESP32-S2のArduino IDEで書き込むと、スマホコントローラーとBLE接続し、PC/PS4/SwitchにUSB接続して実機認識されます。
              </p>
            </div>
          ) : (
            <div>
              <p className="text-white font-medium mb-0.5">プロファイル共有:</p>
              <p>このJSON設定を保存して、他の端末やバックアップとしていつでもインポートできます。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

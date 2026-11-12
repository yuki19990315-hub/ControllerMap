import React, { useState, useRef, useEffect } from 'react';
import { GamepadState, MappingProfile, ScreenMappingNode, TargetControllerType } from '../types/controller';
import { PRESET_PROFILES } from '../utils/presets';
import { Smartphone, Move, Plus, Trash2, Crosshair, Check, Layers, Image as ImageIcon } from 'lucide-react';

interface ScreenMappingStudioProps {
  currentProfile: MappingProfile;
  setProfile: (profile: MappingProfile) => void;
  targetController: TargetControllerType;
  gamepadState: GamepadState;
  onSimulateTouch: (node: ScreenMappingNode, isDown: boolean, touchX?: number, touchY?: number) => void;
}

export const ScreenMappingStudio: React.FC<ScreenMappingStudioProps> = ({
  currentProfile,
  setProfile,
  targetController,
  gamepadState,
  onSimulateTouch,
}) => {
  const isDS4 = targetController === 'DS4';
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(currentProfile.nodes[0]?.id || null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [touchRipples, setTouchRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const screenRef = useRef<HTMLDivElement>(null);

  // Available button targets based on controller
  const buttonTargets = isDS4
    ? [
        { key: 'actionDown', label: '✕ (Cross / 決定・ジャンプ)' },
        { key: 'actionRight', label: '○ (Circle / 回避・キャンセル)' },
        { key: 'actionLeft', label: '□ (Square / 攻撃・リロード)' },
        { key: 'actionUp', label: '△ (Triangle / スキル・武器)' },
        { key: 'l1', label: 'L1 (バンパー)' },
        { key: 'r1', label: 'R1 (バンパー)' },
        { key: 'l2', label: 'L2 (トリガー・ADS照準)' },
        { key: 'r2', label: 'R2 (トリガー・攻撃/射撃)' },
        { key: 'dpadUp', label: '方向キー ↑' },
        { key: 'dpadDown', label: '方向キー ↓' },
        { key: 'dpadLeft', label: '方向キー ←' },
        { key: 'dpadRight', label: '方向キー →' },
        { key: 'l3', label: 'L3 (Lスティック押し込み)' },
        { key: 'r3', label: 'R3 (Rスティック押し込み)' },
        { key: 'select', label: 'SHARE (共有/マップ)' },
        { key: 'start', label: 'OPTIONS (メニュー)' },
        { key: 'home', label: 'PS ボタン' },
      ]
    : [
        { key: 'actionRight', label: 'A (Nintendo 決定)' },
        { key: 'actionDown', label: 'B (Nintendo キャンセル/ジャンプ)' },
        { key: 'actionUp', label: 'X (Nintendo 上ボタン)' },
        { key: 'actionLeft', label: 'Y (Nintendo 左ボタン)' },
        { key: 'l1', label: 'L' },
        { key: 'r1', label: 'R' },
        { key: 'l2', label: 'ZL' },
        { key: 'r2', label: 'ZR' },
        { key: 'dpadUp', label: '十字ボタン ↑' },
        { key: 'dpadDown', label: '十字ボタン ↓' },
        { key: 'dpadLeft', label: '十字ボタン ←' },
        { key: 'dpadRight', label: '十字ボタン →' },
        { key: 'l3', label: '左スティック押し込み' },
        { key: 'r3', label: '右スティック押し込み' },
        { key: 'select', label: 'Minus (-)' },
        { key: 'start', label: 'Plus (+)' },
        { key: 'home', label: 'HOME ボタン' },
        { key: 'touchpadClick', label: 'キャプチャー ボタン' },
      ];

  const selectedNode = currentProfile.nodes.find(n => n.id === selectedNodeId) || null;

  // Handle Dragging Node on Screen in Edit Mode
  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (isTestMode) {
      // In test mode, tapping triggers the node action
      const node = currentProfile.nodes.find(n => n.id === nodeId);
      if (node) {
        onSimulateTouch(node, true);
        addRipple(node.x, node.y);
      }
      return;
    }
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNodeId || !screenRef.current || isTestMode) return;
    const rect = screenRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));

    setProfile({
      ...currentProfile,
      nodes: currentProfile.nodes.map(node =>
        node.id === draggingNodeId ? { ...node, x: Math.round(x), y: Math.round(y) } : node
      ),
    });
  };

  const handlePointerUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  const addRipple = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    setTouchRipples(prev => [...prev.slice(-6), { id, x, y }]);
    setTimeout(() => {
      setTouchRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  };

  const handleAddNewNode = () => {
    const newNode: ScreenMappingNode = {
      id: `node_${Date.now()}`,
      label: '新規ボタン',
      type: 'button',
      targetButton: 'actionDown',
      x: 50,
      y: 50,
      radius: 6,
    };
    setProfile({
      ...currentProfile,
      nodes: [...currentProfile.nodes, newNode],
    });
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (id: string) => {
    setProfile({
      ...currentProfile,
      nodes: currentProfile.nodes.filter(n => n.id !== id),
    });
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  // Check if a node is currently active via controller button state
  const isNodeActive = (node: ScreenMappingNode): boolean => {
    if (node.type === 'joystick') {
      return Math.abs(gamepadState.leftStick.x) > 0.1 || Math.abs(gamepadState.leftStick.y) > 0.1;
    }
    if (node.type === 'camera_swipe') {
      return Math.abs(gamepadState.rightStick.x) > 0.1 || Math.abs(gamepadState.rightStick.y) > 0.1;
    }
    if (node.targetButton) {
      return !!(gamepadState.buttons as any)[node.targetButton];
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Profile Bar & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-neutral-400">プロファイル</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_PROFILES.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setProfile(preset);
                  setSelectedNodeId(preset.nodes[0]?.id || null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  currentProfile.id === preset.id
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Toggle: Edit Mapping vs Test Interaction */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-800 bg-neutral-950 p-1">
            <button
              onClick={() => setIsTestMode(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                isTestMode
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ライブテスト
            </button>
            <button
              onClick={() => setIsTestMode(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                !isTestMode
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              配置・設定編集
            </button>
          </div>

          {!isTestMode && (
            <button
              onClick={handleAddNewNode}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>ボタン追加</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Virtual Smartphone Screen (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-400" />
              <span>スマホ画面シミュレーター (20:9 レターボックス)</span>
            </div>
            <span>
              {isTestMode
                ? '画面をタップしてコントローラー出力をテスト'
                : 'ノードをドラッグして画面位置を調整'}
            </span>
          </div>

          {/* Smartphone Frame */}
          <div
            ref={screenRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full aspect-[20/9] rounded-2xl border-4 border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl select-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)',
            }}
          >
            {/* Center HUD Guideline */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-600" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neutral-600" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-dashed border-neutral-500" />
            </div>

            {/* Mobile Notch & Camera pill */}
            <div className="absolute top-1/2 left-2 -translate-y-1/2 w-3 h-8 bg-neutral-900 rounded-full border border-neutral-800 z-10 pointer-events-none" />

            {/* Touch Ripple Effects */}
            {touchRipples.map(ripple => (
              <span
                key={ripple.id}
                className="absolute pointer-events-none rounded-full border-2 border-indigo-400 bg-indigo-500/20 animate-ping -translate-x-1/2 -translate-y-1/2 z-20"
                style={{
                  left: `${ripple.x}%`,
                  top: `${ripple.y}%`,
                  width: '40px',
                  height: '40px',
                }}
              />
            ))}

            {/* Screen Mapping Nodes */}
            {currentProfile.nodes.map(node => {
              const active = isNodeActive(node);
              const isSelected = selectedNodeId === node.id;

              if (node.type === 'joystick') {
                return (
                  <div
                    key={node.id}
                    onPointerDown={e => handlePointerDown(e, node.id)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all ${
                      isTestMode ? 'cursor-pointer active:scale-95' : 'cursor-move'
                    } ${
                      isSelected
                        ? 'border-2 border-indigo-400 bg-indigo-950/40 shadow-lg shadow-indigo-500/30'
                        : active
                        ? 'border-2 border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/30'
                        : 'border border-neutral-700 bg-neutral-900/60'
                    }`}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      width: `${(node.radius || 12) * 6}px`,
                      height: `${(node.radius || 12) * 6}px`,
                    }}
                  >
                    {/* Inner virtual analog stick */}
                    <div
                      className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-[10px] font-bold text-neutral-300 transition-transform"
                      style={{
                        transform: `translate(${gamepadState.leftStick.x * 16}px, ${-gamepadState.leftStick.y * 16}px)`,
                      }}
                    >
                      L
                    </div>
                    <span className="absolute -bottom-5 text-[10px] font-medium text-neutral-400 whitespace-nowrap">
                      {node.label}
                    </span>
                  </div>
                );
              }

              if (node.type === 'camera_swipe') {
                return (
                  <div
                    key={node.id}
                    onPointerDown={e => handlePointerDown(e, node.id)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col items-center justify-center border border-dashed transition-all ${
                      isTestMode ? 'cursor-pointer active:scale-98' : 'cursor-move'
                    } ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-950/30'
                        : active
                        ? 'border-emerald-400 bg-emerald-950/30'
                        : 'border-neutral-700/80 bg-neutral-900/30'
                    }`}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      width: `${(node.radius || 24) * 8}px`,
                      height: `${(node.radius || 24) * 5}px`,
                    }}
                  >
                    <Crosshair
                      className={`h-6 w-6 transition-transform ${
                        active ? 'text-emerald-400 scale-125' : 'text-neutral-500'
                      }`}
                      style={{
                        transform: `translate(${gamepadState.rightStick.x * 20}px, ${-gamepadState.rightStick.y * 20}px)`,
                      }}
                    />
                    <span className="text-[10px] font-medium text-neutral-400 mt-1">
                      {node.label}
                    </span>
                  </div>
                );
              }

              // Standard Button Node
              return (
                <div
                  key={node.id}
                  onPointerDown={e => handlePointerDown(e, node.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isTestMode ? 'cursor-pointer active:scale-90' : 'cursor-move'
                  } ${
                    isSelected
                      ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-neutral-950'
                      : ''
                  } ${
                    active
                      ? isDS4
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/60 scale-110'
                        : 'bg-red-600 text-white shadow-lg shadow-red-500/60 scale-110'
                      : 'bg-neutral-800/90 text-neutral-200 border border-neutral-700 hover:bg-neutral-700'
                  }`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    width: `${(node.radius || 6) * 7}px`,
                    height: `${(node.radius || 6) * 7}px`,
                  }}
                >
                  <span className="text-[11px] truncate px-1">
                    {node.targetButton
                      ? buttonTargets.find(b => b.key === node.targetButton)?.label.split(' ')[0] || node.label
                      : node.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 font-mono">
            <span>ノード数: {currentProfile.nodes.length}点</span>
            <span>ShootingPlus V3 / Flydigi タッチマッピング互換</span>
          </div>
        </div>

        {/* Right Column: Node Inspector & Settings (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="text-xs font-semibold text-white">
              {selectedNode ? '選択ノード設定' : 'ノード一覧'}
            </span>
            {selectedNode && (
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="text-neutral-400 hover:text-red-400 p-1 transition-colors"
                title="このボタンを削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">ラベル表示名</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={e => {
                    const label = e.target.value;
                    setProfile({
                      ...currentProfile,
                      nodes: currentProfile.nodes.map(n =>
                        n.id === selectedNode.id ? { ...n, label } : n
                      ),
                    });
                  }}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">ノード種別</label>
                <select
                  value={selectedNode.type}
                  onChange={e => {
                    const type = e.target.value as ScreenMappingNode['type'];
                    setProfile({
                      ...currentProfile,
                      nodes: currentProfile.nodes.map(n =>
                        n.id === selectedNode.id ? { ...n, type } : n
                      ),
                    });
                  }}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="button">単発タップボタン</option>
                  <option value="joystick">移動ジョイスティック (Lスティック)</option>
                  <option value="camera_swipe">カメラ視点スワイプ (Rスティック)</option>
                </select>
              </div>

              {selectedNode.type === 'button' && (
                <div>
                  <label className="block text-neutral-400 mb-1">
                    変換先コントローラーボタン ({isDS4 ? 'DUALSHOCK 4' : 'Switch Pro'})
                  </label>
                  <select
                    value={selectedNode.targetButton || 'actionDown'}
                    onChange={e => {
                      const targetButton = e.target.value;
                      setProfile({
                        ...currentProfile,
                        nodes: currentProfile.nodes.map(n =>
                          n.id === selectedNode.id ? { ...n, targetButton } : n
                        ),
                      });
                    }}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {buttonTargets.map(btn => (
                      <option key={btn.key} value={btn.key}>
                        {btn.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-neutral-400 mb-1">X 座標 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedNode.x}
                    onChange={e => {
                      const x = Number(e.target.value);
                      setProfile({
                        ...currentProfile,
                        nodes: currentProfile.nodes.map(n =>
                          n.id === selectedNode.id ? { ...n, x } : n
                        ),
                      });
                    }}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Y 座標 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedNode.y}
                    onChange={e => {
                      const y = Number(e.target.value);
                      setProfile({
                        ...currentProfile,
                        nodes: currentProfile.nodes.map(n =>
                          n.id === selectedNode.id ? { ...n, y } : n
                        ),
                      });
                    }}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">タッチ範囲サイズ: {selectedNode.radius || 6}</label>
                <input
                  type="range"
                  min="3"
                  max="35"
                  value={selectedNode.radius || 6}
                  onChange={e => {
                    const radius = Number(e.target.value);
                    setProfile({
                      ...currentProfile,
                      nodes: currentProfile.nodes.map(n =>
                        n.id === selectedNode.id ? { ...n, radius } : n
                      ),
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500 text-xs">
              画面上のノードをクリックして設定を変更するか、新しいボタンを追加してください。
            </div>
          )}

          {/* Node List Scrollable */}
          <div className="pt-2 border-t border-neutral-800 space-y-1 max-h-48 overflow-y-auto">
            {currentProfile.nodes.map(node => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                  selectedNodeId === node.id
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span className="truncate">{node.label}</span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {node.x}%, {node.y}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

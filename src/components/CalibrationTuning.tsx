import React from 'react';
import { GamepadState, MappingProfile, StickCalibration, StickCurveType } from '../types/controller';
import { Sliders, RotateCw, Compass, Zap, Activity } from 'lucide-react';

interface CalibrationTuningProps {
  profile: MappingProfile;
  setProfile: (profile: MappingProfile) => void;
  gamepadState: GamepadState;
  onUpdateGyro: (pitch: number, roll: number, yaw: number) => void;
}

export const CalibrationTuning: React.FC<CalibrationTuningProps> = ({
  profile,
  setProfile,
  gamepadState,
  onUpdateGyro,
}) => {
  const { leftStickCalibration: left, rightStickCalibration: right, gyroCalibration: gyro } = profile;

  // Render SVG Response Curve
  const renderCurveGraph = (calib: StickCalibration, activeStickVal: number) => {
    const points: string[] = [];
    const width = 200;
    const height = 120;

    for (let i = 0; i <= 20; i++) {
      const input = i / 20;
      let output = 0;

      if (input > calib.deadzoneInner) {
        const clamped = Math.min(input, calib.deadzoneOuter);
        const norm = (clamped - calib.deadzoneInner) / (calib.deadzoneOuter - calib.deadzoneInner);

        switch (calib.curve) {
          case 'exponential':
            output = Math.pow(norm, 2.2);
            break;
          case 'aggressive':
            output = Math.pow(norm, 0.65);
            break;
          case 's_curve':
            output = norm * norm * (3 - 2 * norm);
            break;
          case 'precision':
            output = Math.pow(norm, 3.0);
            break;
          case 'linear':
          default:
            output = norm;
            break;
        }

        if (output > 0 && calib.antiDeadzone > 0) {
          output = calib.antiDeadzone + output * (1.0 - calib.antiDeadzone);
        }
        output = Math.min(1.0, output * calib.sensitivity);
      }

      const x = input * width;
      const y = height - output * height;
      points.push(`${x},${y}`);
    }

    const currentMag = Math.min(1.0, Math.sqrt(activeStickVal * activeStickVal));
    const currentIndicatorX = currentMag * width;

    return (
      <div className="relative rounded-lg border border-neutral-800 bg-neutral-950 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
          {/* Deadzone shaded zone */}
          <rect
            x="0"
            y="0"
            width={calib.deadzoneInner * width}
            height={height}
            fill="#EF4444"
            fillOpacity="0.1"
          />
          {/* Grid lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#262626" strokeDasharray="3 3" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#262626" strokeDasharray="3 3" />

          {/* Curve polyline */}
          <polyline
            fill="none"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />

          {/* Current Live Input Dot */}
          <circle
            cx={currentIndicatorX}
            cy={height - Math.min(1.0, currentMag * calib.sensitivity) * height}
            r="4.5"
            fill="#10B981"
            className="drop-shadow-md"
          />
        </svg>

        <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
          <span>デッドゾーン: {(calib.deadzoneInner * 100).toFixed(0)}%</span>
          <span>感度: {calib.sensitivity.toFixed(2)}x</span>
          <span>限界域: {(calib.deadzoneOuter * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stick Calibration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Stick (Move) Tuning */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="text-sm font-semibold text-white">左スティック (移動 / L-Stick)</span>
            <span className="font-mono text-xs text-neutral-400">
              X: {gamepadState.leftStick.x.toFixed(2)} / Y: {gamepadState.leftStick.y.toFixed(2)}
            </span>
          </div>

          {renderCurveGraph(left, Math.max(Math.abs(gamepadState.leftStick.x), Math.abs(gamepadState.leftStick.y)))}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">レスポンスカーブ特性</label>
              <select
                value={left.curve}
                onChange={e =>
                  setProfile({
                    ...profile,
                    leftStickCalibration: { ...left, curve: e.target.value as StickCurveType },
                  })
                }
                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="linear">リニア (標準・1:1直感的応答)</option>
                <option value="s_curve">Sカーブ (微小入力安定 & 最大ダッシュ)</option>
                <option value="exponential">指数関数 (エイム加速・微調整重視)</option>
                <option value="aggressive">アグレッシブ (立ち上がり最速・格ゲー/アクション)</option>
                <option value="precision">高精度スナイパー (中心付近超高精度)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>中心デッドゾーン (スティック遊び)</span>
                <span className="font-mono text-neutral-200">{(left.deadzoneInner * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.01"
                value={left.deadzoneInner}
                onChange={e =>
                  setProfile({
                    ...profile,
                    leftStickCalibration: { ...left, deadzoneInner: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>アンチデッドゾーン (ゲーム内遊びの相殺)</span>
                <span className="font-mono text-neutral-200">{(left.antiDeadzone * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.01"
                value={left.antiDeadzone}
                onChange={e =>
                  setProfile({
                    ...profile,
                    leftStickCalibration: { ...left, antiDeadzone: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>感度倍率</span>
                <span className="font-mono text-neutral-200">{left.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={left.sensitivity}
                onChange={e =>
                  setProfile({
                    ...profile,
                    leftStickCalibration: { ...left, sensitivity: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={left.invertX}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      leftStickCalibration: { ...left, invertX: e.target.checked },
                    })
                  }
                  className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                />
                <span>X軸 反転</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={left.invertY}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      leftStickCalibration: { ...left, invertY: e.target.checked },
                    })
                  }
                  className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                />
                <span>Y軸 反転</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Stick (Camera/Aim) Tuning */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="text-sm font-semibold text-white">右スティック (視点・エイム / R-Stick)</span>
            <span className="font-mono text-xs text-neutral-400">
              X: {gamepadState.rightStick.x.toFixed(2)} / Y: {gamepadState.rightStick.y.toFixed(2)}
            </span>
          </div>

          {renderCurveGraph(right, Math.max(Math.abs(gamepadState.rightStick.x), Math.abs(gamepadState.rightStick.y)))}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">レスポンスカーブ特性</label>
              <select
                value={right.curve}
                onChange={e =>
                  setProfile({
                    ...profile,
                    rightStickCalibration: { ...right, curve: e.target.value as StickCurveType },
                  })
                }
                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="precision">高精度スナイパー (微細照準 & 高速フリック)</option>
                <option value="exponential">指数関数 (標準FPSエイム)</option>
                <option value="linear">リニア (一定速度)</option>
                <option value="s_curve">Sカーブ</option>
                <option value="aggressive">アグレッシブ</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>中心デッドゾーン</span>
                <span className="font-mono text-neutral-200">{(right.deadzoneInner * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.01"
                value={right.deadzoneInner}
                onChange={e =>
                  setProfile({
                    ...profile,
                    rightStickCalibration: { ...right, deadzoneInner: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>アンチデッドゾーン</span>
                <span className="font-mono text-neutral-200">{(right.antiDeadzone * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.01"
                value={right.antiDeadzone}
                onChange={e =>
                  setProfile({
                    ...profile,
                    rightStickCalibration: { ...right, antiDeadzone: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>感度倍率</span>
                <span className="font-mono text-neutral-200">{right.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={right.sensitivity}
                onChange={e =>
                  setProfile({
                    ...profile,
                    rightStickCalibration: { ...right, sensitivity: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={right.invertX}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      rightStickCalibration: { ...right, invertX: e.target.checked },
                    })
                  }
                  className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                />
                <span>X軸 反転</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={right.invertY}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      rightStickCalibration: { ...right, invertY: e.target.checked },
                    })
                  }
                  className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                />
                <span>Y軸 反転</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Gyro & Motion Aiming Integration */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">6軸ジャイロ・モーションエイム設定</span>
            <span className="text-xs text-neutral-400">· JoyShockMapper 互換</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-300">
            <input
              type="checkbox"
              checked={gyro.enabled}
              onChange={e =>
                setProfile({
                  ...profile,
                  gyroCalibration: { ...gyro, enabled: e.target.checked },
                })
              }
              className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
            />
            <span>ジャイロ有効化</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={gyro.mapToRightStick}
                onChange={e =>
                  setProfile({
                    ...profile,
                    gyroCalibration: { ...gyro, mapToRightStick: e.target.checked },
                  })
                }
                className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
              />
              <span>ジャイロを右スティック入力に合成 (非対応ゲーム向け)</span>
            </label>
            <p className="text-[11px] text-neutral-500">
              ゲーム側がネイティブジャイロ非対応（CoD Mobileや原神など）の場合、端末の傾きを右スティックの視点操作に直接変換します。
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>ジャイロ感度</span>
                <span className="font-mono text-neutral-200">{gyro.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={gyro.sensitivity}
                onChange={e =>
                  setProfile({
                    ...profile,
                    gyroCalibration: { ...gyro, sensitivity: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>ジャイロ不感帯 (微小ノイズカット)</span>
                <span className="font-mono text-neutral-200">{(gyro.deadzone * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.2"
                step="0.01"
                value={gyro.deadzone}
                onChange={e =>
                  setProfile({
                    ...profile,
                    gyroCalibration: { ...gyro, deadzone: Number(e.target.value) },
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-neutral-400 block mb-1">シミュレーション / テストチルト</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateGyro(-15, 0, 0)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                上チルト
              </button>
              <button
                onClick={() => onUpdateGyro(0, 0, 0)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                リセット
              </button>
              <button
                onClick={() => onUpdateGyro(15, 0, 0)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                下チルト
              </button>
              <button
                onClick={() => onUpdateGyro(0, -15, 0)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                左ロール
              </button>
              <button
                onClick={() => onUpdateGyro(0, 0, -25)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                左旋回
              </button>
              <button
                onClick={() => onUpdateGyro(0, 15, 0)}
                className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                右ロール
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

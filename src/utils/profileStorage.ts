import type { MappingProfile } from '../types/controller';

const STORAGE_KEY = 'crosspad.game-profiles.v1';
const MAX_PROFILES = 24;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function isValidProfile(value: unknown): value is MappingProfile {
  if (!isObject(value)) return false;
  const p = value;
  const stick = (x: unknown) => isObject(x) &&
    typeof x.sensitivity === 'number' && typeof x.deadzoneInner === 'number' &&
    typeof x.deadzoneOuter === 'number' && typeof x.antiDeadzone === 'number' &&
    typeof x.curve === 'string' && typeof x.invertX === 'boolean' &&
    typeof x.invertY === 'boolean';
  return typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.name === 'string' && typeof p.gameTitle === 'string' &&
    typeof p.description === 'string' &&
    (p.screenAspectRatio === '16:9' || p.screenAspectRatio === '20:9' || p.screenAspectRatio === '4:3') &&
    Array.isArray(p.nodes) && p.nodes.length <= 128 &&
    isObject(p.v3RemapTable) && Object.values(p.v3RemapTable).every(v => typeof v === 'string') &&
    stick(p.leftStickCalibration) && stick(p.rightStickCalibration) &&
    isObject(p.gyroCalibration) && typeof p.gyroCalibration.enabled === 'boolean' &&
    isObject(p.turboButtons) && typeof p.turboRateHz === 'number';
}

/** Saved locally on this device only: no game account or app permissions. */
export function readGameProfiles(): MappingProfile[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.filter(isValidProfile).slice(0, MAX_PROFILES) : [];
  } catch { return []; }
}

export function writeGameProfiles(profiles: MappingProfile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.slice(0, MAX_PROFILES)));
    return true;
  } catch { return false; }
}

export function makeGameProfile(profile: MappingProfile, gameName: string): MappingProfile {
  const trimmed = gameName.trim().slice(0, 48) || '新しいゲーム';
  return {
    ...JSON.parse(JSON.stringify(profile)) as MappingProfile,
    id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name: trimmed,
    gameTitle: trimmed,
    description: 'この端末に保存されたゲーム別設定',
  };
}

export { MAX_PROFILES };

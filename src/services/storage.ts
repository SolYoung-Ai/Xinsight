/** 可选的浏览器本地保存（用户主动启用）。默认关闭；仅保存在当前浏览器。 */

import type { Dataset } from '../types';

const KEY = 'x-account-insight:v1';

export interface PersistedState {
  enabled: boolean;
  dataset: Dataset | null;
  savedAt: string;
}

const DATE_MARK = '__xai_date__';

export function serialize(state: PersistedState): string {
  // Date 的 toJSON 会在 replacer 前执行，因此改为 stringify 前手动遍历转换
  const conv = (v: unknown): unknown => {
    if (v instanceof Date) return { [DATE_MARK]: v.toISOString() };
    if (Array.isArray(v)) return v.map(conv);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o)) out[k] = conv(o[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(conv(state));
}

export function deserialize(text: string): PersistedState {
  const obj = JSON.parse(text);
  const revive = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(revive);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o[DATE_MARK] === 'string') return new Date(o[DATE_MARK] as string);
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o)) out[k] = revive(o[k]);
      return out;
    }
    return v;
  };
  return revive(obj) as PersistedState;
}

export function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return deserialize(raw);
  } catch {
    return null;
  }
}

export function savePersisted(dataset: Dataset): boolean {
  try {
    const state: PersistedState = { enabled: true, dataset, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, serialize(state));
    return true;
  } catch {
    return false; // QuotaExceededError 或隐私模式下被拒绝
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

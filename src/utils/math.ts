/** 数学统计工具（纯函数，全部可单测）。 */

export function sum(values: Array<number | null | undefined>): number {
  let s = 0;
  for (const v of values) {
    if (v !== null && v !== undefined && isFinite(v)) s += v;
  }
  return s;
}

export function count(values: Array<number | null | undefined>): number {
  let c = 0;
  for (const v of values) {
    if (v !== null && v !== undefined && isFinite(v)) c += 1;
  }
  return c;
}

export function mean(values: Array<number | null | undefined>): number | null {
  const c = count(values);
  return c === 0 ? null : sum(values) / c;
}

export function median(values: Array<number | null | undefined>): number | null {
  const arr = values.filter((v): v is number => v !== null && v !== undefined && isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) return arr[mid];
  return (arr[mid - 1] + arr[mid]) / 2;
}

export function pct(values: Array<number | null | undefined>, p: number): number | null {
  const arr = values.filter((v): v is number => v !== null && v !== undefined && isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const idx = Math.min(arr.length - 1, Math.max(0, Math.round((p / 100) * (arr.length - 1))));
  return arr[idx];
}

/** 变化率（%）。prev 为 0/缺失/不可比时返回 null。 */
export function changeRate(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || !isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function variance(values: Array<number | null | undefined>): number | null {
  const m = mean(values);
  const arr = values.filter((v): v is number => v !== null && v !== undefined && isFinite(v));
  if (m === null || arr.length === 0) return null;
  const s = sum(arr.map((v) => (v - m) ** 2));
  return s / arr.length;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

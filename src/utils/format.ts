/** 数值解析与格式化工具。 */

/** 解析单元格为数字：支持千分位逗号、百分比、K/M/B 后缀。无法解析返回 null。 */
export function parseNumberCell(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let v = s.replace(/,/g, '').replace(/[，]/g, '');
  let mult = 1;
  if (/[%％]$/.test(v)) {
    v = v.replace(/[%％]$/, '');
  }
  const m = v.match(/^([-+]?\d+(?:\.\d+)?)\s*([kKmMbB]?)$/);
  if (!m) return null;
  const num = Number(m[1]);
  if (!isFinite(num)) return null;
  const suffix = (m[2] ?? '').toLowerCase();
  if (suffix === 'k') mult = 1e3;
  if (suffix === 'm') mult = 1e6;
  if (suffix === 'b') mult = 1e9;
  return num * mult;
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(n);
}

export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + ' 亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + ' 万';
  return fmtInt(n);
}

export function fmtPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function fmtDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '无法比较';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function fmtSignedInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + fmtInt(n);
}

/** 取整到小时 */
export function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

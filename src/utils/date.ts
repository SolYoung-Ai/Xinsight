/** 日期工具：解析、格式化、范围计算。 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 解析日期字符串，兼容 X 导出常见格式。失败返回 null。 */
export function parseDateCell(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO：2025-03-06T14:33:00.000Z / 2025-03-06 14:33
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      m[4] ? Number(m[4]) : 0,
      m[5] ? Number(m[5]) : 0,
      m[6] ? Number(m[6]) : 0,
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // MM/DD/YYYY HH:MM（X 美国导出默认）或 DD/MM/YYYY
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    let month = Number(m[1]);
    let day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    // 首个数字 > 12 视为 DD/MM/YYYY；否则按 X 的 MM/DD/YYYY 处理
    if (month > 12) {
      const t = month;
      month = day;
      day = t;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day, m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0, m[6] ? Number(m[6]) : 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // 仅年月日：YYYYMMDD
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // 兜底交给浏览器解析
  const t = Date.parse(s);
  if (!isNaN(t)) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 当天末尾（含毫秒），用于范围右边界，保证包含当天全天的记录。 */
export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** 两日期之间的自然日差（end - start 的天数）。 */
export function diffDays(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

export function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${fmtDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 数据最小/最大日期（跳过无效日期）。 */
export function dateExtent(dates: Array<Date | null>): { min: Date | null; max: Date | null } {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  return { min, max };
}

export function isWithin(d: Date, start: Date, end: Date): boolean {
  const t = startOfDay(d).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

export function weekdayCN(d: Date): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] ?? '';
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

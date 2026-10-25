import { describe, expect, it } from 'vitest';
import { changeRate, count, mean, median, pct, sum, variance } from '../src/utils/math';
import { fmtCompact, fmtPercent, parseNumberCell } from '../src/utils/format';
import { addDays, diffDays, fmtDate, isWithin, parseDateCell, startOfDay } from '../src/utils/date';

describe('数学工具', () => {
  it('sum/count 忽略 null 与 NaN', () => {
    expect(sum([1, 2, null, undefined, NaN, 3])).toBe(6);
    expect(count([1, 2, null, 3])).toBe(3);
  });

  it('mean/median 空数组返回 null', () => {
    expect(mean([])).toBeNull();
    expect(median([null, undefined])).toBeNull();
  });

  it('median 奇偶数量正确', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('pct 分位数', () => {
    // 线性插值口径：idx = round(p/100 * (n-1))
    expect(pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(6);
    expect(pct([], 90)).toBeNull();
  });

  it('changeRate：基准为 0 或缺失返回 null', () => {
    expect(changeRate(10, 20)).toBe(-50);
    expect(changeRate(10, 0)).toBeNull();
    expect(changeRate(null, 10)).toBeNull();
    expect(changeRate(10, null)).toBeNull();
  });

  it('variance 基本计算', () => {
    expect(variance([1, 2, 3, 4, 5])).toBe(2);
  });
});

describe('数值解析', () => {
  it('千分位与百分比', () => {
    expect(parseNumberCell('1,234')).toBe(1234);
    expect(parseNumberCell('12.5%')).toBe(12.5);
    expect(parseNumberCell('3.5K')).toBe(3500);
    expect(parseNumberCell('2M')).toBe(2000000);
  });

  it('异常值返回 null', () => {
    expect(parseNumberCell('abc')).toBeNull();
    expect(parseNumberCell('')).toBeNull();
    expect(parseNumberCell(undefined)).toBeNull();
    expect(parseNumberCell('--')).toBeNull();
  });

  it('负数可解析', () => {
    expect(parseNumberCell('-3')).toBe(-3);
  });
});

describe('格式化', () => {
  it('fmtCompact 万/亿', () => {
    expect(fmtCompact(12345)).toBe('1.2 万');
    expect(fmtCompact(100000000)).toBe('1 亿');
    expect(fmtCompact(null)).toBe('—');
  });
  it('fmtPercent', () => {
    expect(fmtPercent(3.456, 1)).toBe('3.5%');
    expect(fmtPercent(null)).toBe('—');
  });
});

describe('日期工具', () => {
  it('ISO 与斜杠格式解析', () => {
    expect(fmtDate(parseDateCell('2025-03-06 14:33')!)).toBe('2025-03-06');
    expect(fmtDate(parseDateCell('3/6/2025 14:33')!)).toBe('2025-03-06');
    // 首个数字 > 12 → DD/MM/YYYY
    expect(fmtDate(parseDateCell('13/04/2025')!)).toBe('2025-04-13');
  });

  it('异常日期返回 null', () => {
    expect(parseDateCell('not-a-date')).toBeNull();
    expect(parseDateCell('')).toBeNull();
    expect(parseDateCell('32/13/2025')).toBeNull();
  });

  it('diffDays 与 isWithin', () => {
    const a = startOfDay(new Date(2025, 0, 1));
    const b = startOfDay(new Date(2025, 0, 10));
    expect(diffDays(a, b)).toBe(9);
    expect(isWithin(new Date(2025, 0, 5), a, b)).toBe(true);
    expect(isWithin(new Date(2025, 0, 20), a, b)).toBe(false);
    expect(fmtDate(addDays(a, 1))).toBe('2025-01-02');
  });
});

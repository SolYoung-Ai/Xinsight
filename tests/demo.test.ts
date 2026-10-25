import { describe, expect, it } from 'vitest';
import { generateDemoContentCsv, generateDemoOverviewCsv, mulberry32 } from '../src/services/demo';
import { parseCsvText } from '../src/services/import/csv';
import { autoMap } from '../src/services/import/fields';
import { transformContent, transformOverview } from '../src/services/import/transform';

describe('演示数据', () => {
  it('确定性：相同种子产生相同数据', () => {
    const a = generateDemoContentCsv(20261025, 30);
    const b = generateDemoContentCsv(20261025, 30);
    expect(a).toBe(b);
    const c = generateDemoContentCsv(1, 30);
    expect(a).not.toBe(c);
  });

  it('mulberry32 序列确定性', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
    expect(new Set(seq1).size).toBeGreaterThan(1);
  });

  it('Content 演示 CSV 可解析且字段完整', () => {
    const csv = generateDemoContentCsv(20261025, 30, 5);
    const parse = parseCsvText(csv);
    // 演示数据按天生成，每天 1-2 条 → 行数 ≥ 天数且 ≤ 2 倍
    expect(parse.rowCount).toBeGreaterThanOrEqual(30);
    expect(parse.rowCount).toBeLessThanOrEqual(60);
    const mapping = autoMap(parse.headers);
    expect(mapping.impressions).toBeTruthy();
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(parse.rowCount);
    expect(out.records.every((r) => r.impressions !== null && r.date !== null)).toBe(true);
    // 演示数据不与真实数据混淆：字段与口径一致，仅供验证交互
    expect(out.records[0].computedEngagements).toBeGreaterThan(0);
  });

  it('Overview 演示 CSV 可解析', () => {
    const csv = generateDemoOverviewCsv(20261025, 30, 5);
    const parse = parseCsvText(csv);
    const out = transformOverview(parse, autoMap(parse.headers));
    expect(out.parsedCount).toBe(30);
    expect(out.records.every((r) => r.netFollowers !== null)).toBe(true);
  });
});

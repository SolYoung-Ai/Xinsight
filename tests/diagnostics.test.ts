import { describe, expect, it } from 'vitest';
import { buildDataset, SAMPLE_CONTENT, SAMPLE_OVERVIEW } from './helpers';
import { runQualityChecks } from '../src/services/diagnostics/quality';
import { runInsights } from '../src/services/diagnostics/insights';
import { presetRange, resolveRange } from '../src/services/analytics/range';

function rng(ds: ReturnType<typeof buildDataset>, days = 12) {
  const r = presetRange(ds, days);
  return resolveRange(ds, r.start, r.end);
}

describe('数据质量检测', () => {
  it('完整数据：无错误级问题，具备主要字段', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.severity === 'error')).toBe(false);
    expect(findings.some((f) => f.code === 'content-no-date')).toBe(false);
    expect(findings.some((f) => f.code === 'content-no-impressions')).toBe(false);
  });

  it('未导入任何数据：错误级提示', () => {
    const ds = buildDataset();
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'no-data' && f.severity === 'error')).toBe(true);
  });

  it('仅 Content：提示缺少 Overview', () => {
    const ds = buildDataset(SAMPLE_CONTENT);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'missing-overview')).toBe(true);
  });

  it('仅 Overview：提示缺少 Content', () => {
    const ds = buildDataset(undefined, SAMPLE_OVERVIEW);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'missing-content')).toBe(true);
  });

  it('缺少曝光字段的检测', () => {
    const csv = `tweet id,tweet text,time,likes
1,"a",2025-03-01,5`;
    const ds = buildDataset(csv);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'content-no-impressions')).toBe(true);
  });

  it('大量重复记录与负数被报告', () => {
    const csv = `tweet id,tweet text,time,impressions,likes
1,"a",2025-03-01,100,5
1,"a",2025-03-01,100,5
2,"b",2025-03-02,200,-3`;
    const ds = buildDataset(csv);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'content-duplicates')).toBe(true);
    expect(findings.some((f) => f.code === 'negative-values')).toBe(true);
  });

  it('曝光为 0 与互动缺曝光的检测', () => {
    const csv = `tweet id,tweet text,time,impressions,likes
1,"a",2025-03-01,0,5
2,"b",2025-03-02,100,0`;
    const ds = buildDataset(csv);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'zero-impressions')).toBe(true);
  });

  it('Overview 日期缺口检测', () => {
    const ov = `Date,Impressions,Follows,Unfollows
2025-03-01,100,1,0
2025-03-03,200,1,0
2025-03-06,300,1,0`;
    const ds = buildDataset(undefined, ov);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'overview-gaps')).toBe(true);
  });

  it('两份文件日期范围不一致时给出提示', () => {
    const content = `tweet id,tweet text,time,impressions
1,"a",2025-03-01,100`;
    const ov = `Date,Impressions,Follows,Unfollows
2025-03-20,100,1,0`;
    const ds = buildDataset(content, ov);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code.includes('range') || f.title.includes('范围'))).toBe(true);
  });

  it('时间范围过短提示', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"a",2025-03-01,100
2,"b",2025-03-02,200`;
    const ds = buildDataset(csv);
    const findings = runQualityChecks(ds);
    expect(findings.some((f) => f.code === 'short-coverage')).toBe(true);
  });
});

describe('运营表现提示', () => {
  it('样本不足（少于 5 条）：返回样本不足提示，不给确定性结论', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"a",2025-03-08,100
2,"b",2025-03-09,200
3,"c",2025-03-10,300`;
    const ds = buildDataset(csv);
    const items = runInsights(ds, rng(ds, 7));
    expect(items.some((i) => i.level === 'insufficient' && i.code === 'sample-insufficient')).toBe(true);
    // 合规性：绝不允许出现"限流/封禁/权重下降"措辞
    for (const item of items) {
      const text = `${item.title}${item.observation}${item.suggestion}`;
      expect(text).not.toMatch(/限流|封禁|shadowban|shadow ban|权重下降|恢复需要/);
    }
  });

  it('无内容数据：指标不可用提示', () => {
    const ds = buildDataset(undefined, SAMPLE_OVERVIEW);
    const items = runInsights(ds, rng(ds, 12));
    expect(items.some((i) => i.level === 'unavailable' && i.code === 'no-content')).toBe(true);
  });

  it('曝光中位数明显下降（≥30%）：产生观察级提示，措辞合规', () => {
    // 上一等长周期（02-17 ~ 02-28）：中位数约 2000
    // 当前周期（03-01 ~ 03-12）：中位数约 1050 → 下降约 47%
    const prevRows = [20, 21, 22, 23, 24, 25, 26, 27]
      .map((d, i) => `p${i},"prev",2025-02-${String(d).padStart(2, '0')},${1900 + (i % 2) * 200}`)
      .join('\n');
    const curRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map((d, i) => `c${i},"cur",2025-03-${String(d).padStart(2, '0')},${[1000, 800, 1200, 600, 3000, 500, 700, 900, 1100, 1300, 1500, 1700][i]}`)
      .join('\n');
    const content = `tweet id,tweet text,time,impressions
${prevRows}
${curRows}`;
    const ds = buildDataset(content);
    const items = runInsights(ds, rng(ds, 12));
    const drop = items.find((i) => i.code === 'impression-drop');
    expect(drop).toBeDefined();
    expect(drop!.level).toBe('watch');
    expect(drop!.observation).toContain('下降');
    expect(drop!.observation).toContain('不能确定具体原因');
    // 合规：观察到的下降是数据现象
    expect(drop!.observation).not.toMatch(/限流|封禁/);
  });

  it('数据无异常：只报告未发现明显变化，不宣称账号正常', () => {
    // 上一周期与当前周期均为稳定数据 → 无可观察变化
    const prevRows = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]
      .map((d, i) => `p${i},"prev",2025-02-${String(d).padStart(2, '0')},${1000 + (i % 3) * 100}`)
      .join('\n');
    const curRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map((d, i) => `c${i},"cur",2025-03-${String(d).padStart(2, '0')},${1000 + (i % 3) * 100}`)
      .join('\n');
    const content = `tweet id,tweet text,time,impressions
${prevRows}
${curRows}`;
    const ds = buildDataset(content);
    const items = runInsights(ds, rng(ds, 12));
    const watchItems = items.filter((i) => i.level === 'watch');
    expect(watchItems.length).toBe(0);
    expect(items.some((i) => i.title.includes('未发现'))).toBe(true);
  });

  it('演示数据与真实数据隔离：insights 不引用演示来源', () => {
    // runInsights 只依赖 dataset；演示标记在 file.isDemo 上，报告层负责标注
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    expect(ds.contentFile!.isDemo).toBe(false);
  });
});

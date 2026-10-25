import { describe, expect, it } from 'vitest';
import { buildDataset, SAMPLE_CONTENT, SAMPLE_OVERVIEW } from './helpers';
import { computeMetrics } from '../src/services/analytics/metrics';
import { comparePeriods } from '../src/services/analytics/compare';
import { buildDailySeries, buildWeeklySeries } from '../src/services/analytics/trends';
import { presetRange, resolveRange } from '../src/services/analytics/range';
import { startOfDay } from '../src/utils/date';

function rangeOf(dataset: ReturnType<typeof buildDataset>, days = 12) {
  const r = presetRange(dataset, days);
  return resolveRange(dataset, r.start, r.end);
}

describe('核心指标', () => {
  it('两份文件同时导入：核心指标与净增粉丝', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const metrics = computeMetrics(ds, rangeOf(ds));
    expect(metrics.postCount).toBe(12);
    // 总曝光 = 1000+800+1200+600+3000+500+700+900+1100+1300+1500+1700
    expect(metrics.totalImpressions).toBe(14300);
    expect(metrics.medianImpressionsPerPost).toBe(1050); // 排序后第 6/7 位均值
    expect(metrics.totalEngagements).not.toBeNull();
    // 互动率 = 互动/曝光*100
    expect(metrics.engagementRate).toBeCloseTo((metrics.totalEngagements! / 14300) * 100, 5);
    // 净增粉丝 = follows - unfollows
    const f = SAMPLE_OVERVIEW.split('\n').slice(1).reduce((acc, line) => acc + Number(line.split(',')[7]), 0);
    const u = SAMPLE_OVERVIEW.split('\n').slice(1).reduce((acc, line) => acc + Number(line.split(',')[8]), 0);
    expect(metrics.netFollowers).toBe(f - u);
    expect(metrics.availability.impressions).toBe('available');
    expect(metrics.availability.unfollows).toBe('available');
  });

  it('仅有 Content CSV', () => {
    const ds = buildDataset(SAMPLE_CONTENT);
    const metrics = computeMetrics(ds, rangeOf(ds));
    expect(metrics.totalImpressions).toBe(14300);
    expect(metrics.netFollowers).toBeNull(); // 无 overview 关注数据
    expect(metrics.availability.unfollows).toBe('missing');
    // SAMPLE_CONTENT 含 user profile clicks 列 → 可计算主页访问
    expect(metrics.totalProfileVisits).toBe(61);
    expect(metrics.availability.profileVisits).toBe('available');
  });

  it('仅有 Overview CSV', () => {
    const ds = buildDataset(undefined, SAMPLE_OVERVIEW);
    const metrics = computeMetrics(ds, rangeOf(ds));
    expect(metrics.postCount).toBe(0);
    expect(metrics.totalImpressions).toBeNull(); // 无内容曝光
    expect(metrics.dailyAvgImpressions).not.toBeNull(); // overview 口径可用
    expect(metrics.engagementRate).toBeNull();
    expect(metrics.netFollowers).not.toBeNull();
  });

  it('缺失曝光字段：显示缺失而非 0', () => {
    const csv = `tweet id,tweet text,time,likes
1,"a",2025-03-01,5
2,"b",2025-03-02,6`;
    const ds = buildDataset(csv);
    const metrics = computeMetrics(ds, rangeOf(ds));
    expect(metrics.totalImpressions).toBeNull();
    expect(metrics.availability.impressions).toBe('missing');
    expect(metrics.engagementRate).toBeNull();
  });

  it('所有曝光为 0：总曝光=0（有效），互动率无法计算', () => {
    const csv = `tweet id,tweet text,time,impressions,likes
1,"a",2025-03-01,0,1
2,"b",2025-03-02,0,2`;
    const ds = buildDataset(csv);
    const metrics = computeMetrics(ds, rangeOf(ds));
    expect(metrics.totalImpressions).toBe(0);
    expect(metrics.engagementRate).toBeNull();
  });

  it('切换日期范围后重新计算', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const r7 = rangeOf(ds, 7);
    const r12 = rangeOf(ds, 12);
    const m7 = computeMetrics(ds, r7);
    const m12 = computeMetrics(ds, r12);
    expect(m12.postCount).toBe(12);
    expect(m7.postCount).toBe(7);
    expect(m7.totalImpressions).toBeLessThan(m12.totalImpressions!);
  });
});

describe('周期比较', () => {
  it('正常拆分与变化率', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const r = rangeOf(ds, 6); // 03-07 ~ 03-12
    const cmp = comparePeriods(ds, r.start, r.end);
    const cur = cmp.current!;
    const prev = cmp.previous!;
    expect(cur.postCount).toBe(6);
    expect(prev.postCount).toBe(6);
    expect(cmp.comparable).toBe(true);
    expect(cmp.changes.postCount).toBe(0);
    // 当前 03-07~03-12 曝光 = 700+900+1100+1300+1500+1700 = 7200
    // 上一 03-01~03-06 = 1000+800+1200+600+3000+500 = 7100
    expect(cmp.changes.impressions).toBeCloseTo(((7200 - 7100) / 7100) * 100, 3);
  });

  it('对比周期为 0（无帖子）：不产生百分比', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"only one",2025-03-12,100`;
    const ds = buildDataset(csv);
    const r = rangeOf(ds, 7);
    const cmp = comparePeriods(ds, r.start, r.end);
    expect(cmp.comparable).toBe(false);
    expect(cmp.changes.impressions).toBeNull();
    expect(cmp.changes.postCount).toBeNull();
  });

  it('样本不足时不给出确定性结论', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"a",2025-03-08,100
2,"b",2025-03-09,200
3,"c",2025-03-10,300`;
    const ds = buildDataset(csv);
    const r = rangeOf(ds, 7);
    const cmp = comparePeriods(ds, r.start, r.end);
    // 当前周期 3 条 < 5，上一周期 0 条
    expect(cmp.comparable).toBe(false);
    expect(cmp.changes.medianImpressions).toBeNull();
  });
});

describe('范围解析', () => {
  it('无交集范围 noCoverage', () => {
    const ds = buildDataset(SAMPLE_CONTENT);
    const r = resolveRange(ds, startOfDay(new Date(2024, 0, 1)), startOfDay(new Date(2024, 0, 10)));
    expect(r.noCoverage).toBe(true);
    expect(r.coverageDays).toBe(0);
  });

  it('完全覆盖与部分覆盖', () => {
    const ds = buildDataset(SAMPLE_CONTENT);
    const r1 = resolveRange(ds, startOfDay(new Date(2025, 2, 1)), startOfDay(new Date(2025, 2, 12)));
    expect(r1.fullyCovered).toBe(true);
    const r2 = resolveRange(ds, startOfDay(new Date(2025, 1, 1)), startOfDay(new Date(2025, 2, 12)));
    expect(r2.fullyCovered).toBe(false);
    expect(r2.coverageDays).toBe(12);
    expect(r2.start.getMonth()).toBe(2);
  });
});

describe('趋势序列', () => {
  it('每日序列按日聚合', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const r = rangeOf(ds, 12);
    const daily = buildDailySeries(ds, r);
    expect(daily.length).toBe(12);
    expect(daily[0].postCount).toBe(1);
    const firstKey = `${r.start.getFullYear()}-${String(r.start.getMonth() + 1).padStart(2, '0')}-${String(r.start.getDate()).padStart(2, '0')}`;
    expect(daily[0].date).toBe(firstKey);
    expect(daily[0].overviewImpressions).not.toBeNull();
  });

  it('周聚合', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const r = rangeOf(ds, 12);
    const weekly = buildWeeklySeries(ds, r);
    expect(weekly.length).toBeGreaterThanOrEqual(2);
    const total = weekly.reduce((acc, w) => acc + w.postCount, 0);
    expect(total).toBe(12);
  });
});

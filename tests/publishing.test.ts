import { describe, expect, it } from 'vitest';
import { buildDataset, SAMPLE_CONTENT, SAMPLE_OVERVIEW } from './helpers';
import { summarizePublishing, publishingByWeekday, publishingByHour } from '../src/services/analytics/publishing';
import { presetRange, resolveRange } from '../src/services/analytics/range';

function rng(ds: ReturnType<typeof buildDataset>, days = 12) {
  const r = presetRange(ds, days);
  return resolveRange(ds, r.start, r.end);
}

describe('发帖分析', () => {
  it('周均发帖与频率变化', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const s = summarizePublishing(ds, rng(ds, 12));
    expect(s.postsPerWeek).toBe(7); // 12 天 ≈ 1.714 周 → 12/1.714 = 7
    // 上一等长周期（02-17~02-28）无数据 → 无法计算变化率
    expect(s.frequencyChange).toBeNull();
    expect(s.weekdayStats.length).toBeGreaterThan(0);
    expect(s.hourStats.length).toBeGreaterThan(0);
  });

  it('没有发帖时间的帖子不产生时间分布', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"no time",not-a-date,100
2,"no time2",bad-date,200`;
    const ds = buildDataset(csv);
    const byWeekday = publishingByWeekday(ds.content);
    const byHour = publishingByHour(ds.content);
    expect(byWeekday.length).toBe(0);
    expect(byHour.length).toBe(0);
  });

  it('高表现时间段需要足够样本', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const s = summarizePublishing(ds, rng(ds, 12));
    // 每个时间段有 1 条样本，低于阈值 → 不应产生高表现结论
    expect(s.bestWeekdays.length).toBe(0);
    expect(s.bestHours.length).toBe(0);
  });
});

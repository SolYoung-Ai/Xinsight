/** 趋势序列：按日/按周聚合内容与 Overview 数据。 */

import type { Dataset } from '../../types';
import { addDays, fmtDate, startOfDay } from '../../utils/date';
import { count, sum } from '../../utils/math';
import type { EffectiveRange } from './range';

export interface DailyPoint {
  date: string;
  label: string;
  /** 内容曝光合计 */
  impressions: number | null;
  /** Overview 曝光合计 */
  overviewImpressions: number | null;
  /** 互动量合计（内容口径） */
  engagements: number | null;
  /** 互动率 %（当日） */
  engagementRate: number | null;
  /** 发帖数 */
  postCount: number;
  follows: number | null;
  unfollows: number | null;
  netFollowers: number | null;
  profileVisits: number | null;
}

export interface WeekPoint {
  weekStart: string;
  label: string;
  postCount: number;
  impressions: number | null;
  engagements: number | null;
  engagementRate: number | null;
  follows: number | null;
  netFollowers: number | null;
}

export function buildDailySeries(dataset: Dataset, range: EffectiveRange): DailyPoint[] {
  const { start, end } = range;
  const days: DailyPoint[] = [];
  const overviewByDate = new Map<string, Dataset['overview'][number]>();
  for (const o of dataset.overview) if (o.date) overviewByDate.set(fmtDate(o.date), o);

  let cur = startOfDay(start);
  while (cur <= end) {
    const key = fmtDate(cur);
    const dayPosts = dataset.content.filter((p) => p.date && fmtDate(p.date) === key);
    const o = overviewByDate.get(key);
    const impressions = count(dayPosts.map((p) => p.impressions)) > 0 ? sum(dayPosts.map((p) => p.impressions)) : null;
    const engagements = count(dayPosts.map((p) => p.computedEngagements)) > 0 ? sum(dayPosts.map((p) => p.computedEngagements)) : null;
    let engagementRate: number | null = null;
    if (impressions !== null && impressions > 0 && engagements !== null) engagementRate = (engagements / impressions) * 100;

    days.push({
      date: key,
      label: key.slice(5),
      impressions,
      overviewImpressions: o?.impressions ?? null,
      engagements,
      engagementRate,
      postCount: dayPosts.length,
      follows: o?.follows ?? null,
      unfollows: o?.unfollows ?? null,
      netFollowers: o?.netFollowers ?? null,
      profileVisits: o?.profileVisits ?? null,
    });
    cur = addDays(cur, 1);
  }
  return days;
}

/** 周聚合（周一为一周起点）。 */
export function buildWeeklySeries(dataset: Dataset, range: EffectiveRange): WeekPoint[] {
  const daily = buildDailySeries(dataset, range);
  const weeks = new Map<string, WeekPoint>();
  const dayOfWeek = (d: Date) => (d.getDay() + 6) % 7; // 周一=0

  for (const p of daily) {
    const d = new Date(p.date + 'T00:00:00');
    const ws = addDays(d, -dayOfWeek(d));
    const key = fmtDate(ws);
    let w = weeks.get(key);
    if (!w) {
      w = { weekStart: key, label: key.slice(5), postCount: 0, impressions: null, engagements: null, engagementRate: null, follows: null, netFollowers: null };
      weeks.set(key, w);
    }
    w.postCount += p.postCount;
    if (p.impressions !== null) w.impressions = (w.impressions ?? 0) + p.impressions;
    if (p.engagements !== null) w.engagements = (w.engagements ?? 0) + p.engagements;
    if (p.follows !== null) w.follows = (w.follows ?? 0) + p.follows;
    if (p.netFollowers !== null) w.netFollowers = (w.netFollowers ?? 0) + p.netFollowers;
  }

  for (const w of weeks.values()) {
    if (w.impressions !== null && w.impressions > 0 && w.engagements !== null) {
      w.engagementRate = (w.engagements / w.impressions) * 100;
    }
  }
  return [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** 发帖分析：频率、星期/小时分布、高表现时间段。 */

import type { ContentPost, Dataset } from '../../types';
import { count, mean, median, sum } from '../../utils/math';
import { diffDays, weekdayCN } from '../../utils/date';
import { THRESHOLDS } from './thresholds';
import type { EffectiveRange } from './range';

export interface BucketStat {
  key: string;
  label: string;
  count: number;
  totalImpressions: number | null;
  avgImpressions: number | null;
  medianImpressions: number | null;
  engagementRate: number | null;
}

export interface PublishingSummary {
  postsPerWeek: number;
  prevPostsPerWeek: number;
  frequencyChange: number | null;
  /** 高表现星期（中位数曝光高于整体且有足够样本） */
  bestWeekdays: string[];
  /** 高表现小时段 */
  bestHours: string[];
  weekdayStats: BucketStat[];
  hourStats: BucketStat[];
  overallMedian: number | null;
}

function bucketStats(
  posts: ContentPost[],
  keyFn: (p: ContentPost) => { key: string; label: string } | null,
): BucketStat[] {
  const buckets = new Map<string, { label: string; posts: ContentPost[] }>();
  for (const p of posts) {
    const k = keyFn(p);
    if (!k) continue;
    let b = buckets.get(k.key);
    if (!b) {
      b = { label: k.label, posts: [] };
      buckets.set(k.key, b);
    }
    b.posts.push(p);
  }
  const out: BucketStat[] = [];
  for (const [key, b] of buckets) {
    const imp = b.posts.map((p) => p.impressions);
    const eng = b.posts.map((p) => p.computedEngagements);
    const totalImp = count(imp) > 0 ? sum(imp) : null;
    let er: number | null = null;
    if (totalImp !== null && totalImp > 0 && count(eng) > 0) {
      er = (sum(eng) / totalImp) * 100;
    }
    out.push({
      key,
      label: b.label,
      count: b.posts.length,
      totalImpressions: totalImp,
      avgImpressions: mean(imp),
      medianImpressions: median(imp),
      engagementRate: er,
    });
  }
  return out;
}

export function publishingByWeekday(posts: ContentPost[], shift?: (d: Date) => Date): BucketStat[] {
  const stats = bucketStats(posts, (p) => {
    if (!p.date) return null;
    const d = shift ? shift(p.date) : p.date;
    return { key: String(d.getDay()), label: weekdayCN(d) };
  });
  const order = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return stats.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export function publishingByHour(posts: ContentPost[], shift?: (d: Date) => Date): BucketStat[] {
  const stats = bucketStats(posts, (p) => {
    if (!p.date) return null;
    const d = shift ? shift(p.date) : p.date;
    return { key: String(d.getHours()), label: `${String(d.getHours()).padStart(2, '0')}:00` };
  });
  return stats.sort((a, b) => Number(a.key) - Number(b.key));
}

/** 找出中位数曝光高于整体中位数、且样本 >= 阈值的时段。 */
function highPerfBuckets(stats: BucketStat[], overallMedian: number | null, threshold: number): string[] {
  if (overallMedian === null || overallMedian <= 0) return [];
  return stats
    .filter((s) => s.count >= threshold && s.medianImpressions !== null && s.medianImpressions > overallMedian)
    .sort((a, b) => (b.medianImpressions ?? 0) - (a.medianImpressions ?? 0))
    .slice(0, 3)
    .map((s) => s.label);
}

export function summarizePublishing(dataset: Dataset, range: EffectiveRange): PublishingSummary {
  const posts = dataset.content.filter((p) => p.date && p.date >= range.start && p.date <= range.end);
  const weekdayStats = publishingByWeekday(posts);
  const hourStats = publishingByHour(posts);
  const overallMedian = median(posts.map((p) => p.impressions));

  // 发帖频率：周均发帖（近 4 周 vs 此前 4 周）
  const lenDays = diffDays(range.start, range.end) + 1;
  const weeks = Math.max(1, lenDays / 7);
  const postsPerWeek = posts.length / weeks;

  const prevStart = new Date(range.start.getTime() - lenDays * 86400000);
  const prevEnd = new Date(range.start.getTime() - 86400000);
  const prevPosts = dataset.content.filter((p) => p.date && p.date >= prevStart && p.date <= prevEnd);
  const prevPostsPerWeek = prevPosts.length / weeks;
  const frequencyChange =
    prevPostsPerWeek > 0 && postsPerWeek > 0 ? ((postsPerWeek - prevPostsPerWeek) / prevPostsPerWeek) * 100 : null;

  return {
    postsPerWeek,
    prevPostsPerWeek,
    frequencyChange,
    bestWeekdays: highPerfBuckets(weekdayStats, overallMedian, THRESHOLDS.minSampleForTimeAnalysis),
    bestHours: highPerfBuckets(hourStats, overallMedian, THRESHOLDS.minSampleForTimeAnalysis),
    weekdayStats,
    hourStats,
    overallMedian,
  };
}

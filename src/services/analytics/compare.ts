/** 前后等长周期比较：当前周期 vs 上一等长周期。 */

import type { Dataset } from '../../types';
import { addDays, diffDays, endOfDay, fmtDate, startOfDay } from '../../utils/date';
import { changeRate, count, median, sum } from '../../utils/math';
import { THRESHOLDS } from './thresholds';

export interface PeriodStats {
  start: Date;
  end: Date;
  label: string;
  postCount: number;
  totalImpressions: number | null;
  medianImpressions: number | null;
  totalEngagements: number | null;
  engagementRate: number | null;
  follows: number | null;
  unfollows: number | null;
  netFollowers: number | null;
  days: number;
}

export interface ComparisonResult {
  current: PeriodStats | null;
  previous: PeriodStats | null;
  changes: {
    impressions: number | null;
    postCount: number | null;
    medianImpressions: number | null;
    engagements: number | null;
    engagementRate: number | null;
    netFollowers: number | null;
    follows: number | null;
  };
  /** 两个周期均满足最低样本 */
  comparable: boolean;
  currentSampleOK: boolean;
  previousSampleOK: boolean;
  /** 各周期建议样本是否满足 */
  preferred: boolean;
}

function statsFor(dataset: Dataset, start: Date, end: Date): PeriodStats {
  const s = startOfDay(start);
  const e = endOfDay(end);
  const posts = dataset.content.filter((p) => p.date && p.date >= s && p.date <= e);
  const overview = dataset.overview.filter((o) => o.date && o.date >= s && o.date <= e);

  const impressions = posts.map((p) => p.impressions);
  const totalImpressions = count(impressions) > 0 ? sum(impressions) : null;
  const medianImpressions = median(impressions);
  const eng = posts.map((p) => p.computedEngagements);
  const totalEngagements = count(eng) > 0 ? sum(eng) : null;
  let engagementRate: number | null = null;
  if (totalImpressions && totalImpressions > 0 && totalEngagements !== null) {
    engagementRate = (totalEngagements / totalImpressions) * 100;
  }
  const follows = count(overview.map((o) => o.follows)) > 0 ? sum(overview.map((o) => o.follows)) : null;
  const unfollows = count(overview.map((o) => o.unfollows)) > 0 ? sum(overview.map((o) => o.unfollows)) : null;
  const netFollowers = follows !== null && unfollows !== null ? follows - unfollows : null;

  const days = diffDays(s, e) + 1;
  return {
    start: s,
    end: e,
    label: `${fmtDate(s)} ~ ${fmtDate(e)}`,
    postCount: posts.length,
    totalImpressions,
    medianImpressions,
    totalEngagements,
    engagementRate,
    follows,
    unfollows,
    netFollowers,
    days,
  };
}

/** 将 [start,end] 等分为当前周期 + 前一等长周期。 */
export function comparePeriods(dataset: Dataset, start: Date, end: Date): ComparisonResult {
  const s = startOfDay(start);
  const e = startOfDay(end);
  const len = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = endOfDay(addDays(s, -1));
  const prevStart = addDays(prevEnd, -(len - 1));

  const current = statsFor(dataset, s, e);
  const previous = statsFor(dataset, prevStart, prevEnd);

  const ok = (n: number) => n >= THRESHOLDS.minSamplePerPeriod;
  const currentSampleOK = current.postCount >= THRESHOLDS.minSamplePerPeriod;
  const previousSampleOK = previous.postCount >= THRESHOLDS.minSamplePerPeriod;
  const preferred =
    current.postCount >= THRESHOLDS.preferredSamplePerPeriod &&
    previous.postCount >= THRESHOLDS.preferredSamplePerPeriod;

  const chg = (c: number | null, p: number | null) => (ok(current.postCount) && ok(previous.postCount) ? changeRate(c, p) : null);

  return {
    current,
    previous,
    changes: {
      impressions: chg(current.totalImpressions, previous.totalImpressions),
      postCount: chg(current.postCount, previous.postCount),
      medianImpressions: chg(current.medianImpressions, previous.medianImpressions),
      engagements: chg(current.totalEngagements, previous.totalEngagements),
      engagementRate: chg(current.engagementRate, previous.engagementRate),
      netFollowers: chg(current.netFollowers, previous.netFollowers),
      follows: chg(current.follows, previous.follows),
    },
    comparable: currentSampleOK && previousSampleOK,
    currentSampleOK,
    previousSampleOK,
    preferred,
  };
}

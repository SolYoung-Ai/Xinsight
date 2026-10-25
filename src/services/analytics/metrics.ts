/** 核心指标计算：总曝光、日均、单帖均值/中位数、互动量、互动率、净增粉丝等。 */

import type { Dataset } from '../../types';
import { count, mean, median, pct, sum } from '../../utils/math';
import { diffDays, fmtDate } from '../../utils/date';
import type { EffectiveRange } from './range';

export type MetricAvailability = 'available' | 'missing' | 'partial';

export interface CoreMetrics {
  range: EffectiveRange;
  /** 总曝光量 */
  totalImpressions: number | null;
  /** 日均曝光量（优先 Overview 每日曝光；否则内容曝光 ÷ 有内容天数） */
  dailyAvgImpressions: number | null;
  /** 单帖平均曝光 */
  avgImpressionsPerPost: number | null;
  /** 单帖曝光中位数 */
  medianImpressionsPerPost: number | null;
  /** 单帖曝光 P90 */
  p90ImpressionsPerPost: number | null;
  /** 总互动量（按可用分量求和） */
  totalEngagements: number | null;
  /** 互动率 % */
  engagementRate: number | null;
  /** 帖子总数 */
  postCount: number;
  /** 每日平均发帖数 */
  avgPostsPerDay: number | null;
  totalLikes: number | null;
  totalReplies: number | null;
  totalReposts: number | null;
  totalQuotes: number | null;
  totalBookmarks: number | null;
  totalProfileVisits: number | null;
  totalFollows: number | null;
  totalUnfollows: number | null;
  /** 净增粉丝（follows - unfollows，两者齐备才计算） */
  netFollowers: number | null;
  /** 仅一个字段时的部分净增（供展示并明确标注） */
  partialNetFollowers: number | null;
  /** 有内容数据的天数 */
  contentDays: number;
  /** 有 Overview 数据的天数 */
  overviewDays: number;
  /** 各字段可用性 */
  availability: Record<string, MetricAvailability>;
}

export function computeMetrics(dataset: Dataset, range: EffectiveRange): CoreMetrics {
  const { start, end } = range;
  const posts = dataset.content.filter((p) => p.date && p.date >= start && p.date <= end);
  const overview = dataset.overview.filter((o) => o.date && o.date >= start && o.date <= end);

  const impressions = posts.map((p) => p.impressions);
  const totalImpressions = count(impressions) > 0 ? sum(impressions) : null;
  const avgImpressionsPerPost = mean(impressions);
  const medianImpressionsPerPost = median(impressions);
  const p90ImpressionsPerPost = pct(impressions, 90);

  const engagementsPerPost = posts.map((p) => p.computedEngagements);
  const totalEngagements = count(engagementsPerPost) > 0 ? sum(engagementsPerPost) : null;

  let engagementRate: number | null = null;
  if (totalImpressions !== null && totalImpressions > 0 && totalEngagements !== null) {
    engagementRate = (totalEngagements / totalImpressions) * 100;
  }

  const contentDays = new Set(posts.filter((p) => p.date).map((p) => fmtDate(p.date!))).size;
  const overviewDays = overview.length;
  const rangeDays = Math.max(1, diffDays(start, end) + 1);

  // 日均曝光：Overview 优先（真实每日汇总），否则内容口径
  const overviewImp = overview.map((o) => o.impressions);
  let dailyAvgImpressions: number | null = null;
  if (count(overviewImp) > 0) {
    dailyAvgImpressions = sum(overviewImp) / overviewDays;
  } else if (totalImpressions !== null && contentDays > 0) {
    dailyAvgImpressions = totalImpressions / contentDays;
  }

  const sumField = (vals: Array<number | null>) => (count(vals) > 0 ? sum(vals) : null);
  const totalLikes = sumField(posts.map((p) => p.likes));
  const totalReplies = sumField(posts.map((p) => p.replies));
  const totalReposts = sumField(posts.map((p) => p.reposts));
  const totalQuotes = sumField(posts.map((p) => p.quotes));
  const totalBookmarks = sumField(posts.map((p) => p.bookmarks));
  const totalProfileVisits = sumField([...posts.map((p) => p.profileVisits), ...overview.map((o) => o.profileVisits)]);
  const totalFollows = sumField([...posts.map((p) => p.follows), ...overview.map((o) => o.follows)]);
  const totalUnfollows = sumField(overview.map((o) => o.unfollows));

  const followsOk = count(overview.map((o) => o.follows)) > 0 || count(posts.map((p) => p.follows)) > 0;
  const unfollowsOk = count(overview.map((o) => o.unfollows)) > 0;
  let netFollowers: number | null = null;
  let partialNetFollowers: number | null = null;
  if (followsOk && unfollowsOk) {
    const f = (count(overview.map((o) => o.follows)) > 0 ? sum(overview.map((o) => o.follows)) : totalFollows) ?? 0;
    const u = sum(overview.map((o) => o.unfollows));
    netFollowers = f - u;
  } else if (followsOk) {
    partialNetFollowers = totalFollows;
  } else if (unfollowsOk) {
    partialNetFollowers = -(sum(overview.map((o) => o.unfollows)));
  }

  const avgPostsPerDay = posts.length > 0 ? posts.length / rangeDays : null;

  const availability: Record<string, MetricAvailability> = {
    impressions: fieldAvail(posts.map((p) => p.impressions), hasMapping(dataset, 'content', 'impressions')),
    likes: fieldAvail(posts.map((p) => p.likes), hasMapping(dataset, 'content', 'likes')),
    replies: fieldAvail(posts.map((p) => p.replies), hasMapping(dataset, 'content', 'replies')),
    reposts: fieldAvail(posts.map((p) => p.reposts), hasMapping(dataset, 'content', 'reposts')),
    quotes: fieldAvail(posts.map((p) => p.quotes), hasMapping(dataset, 'content', 'quotes')),
    bookmarks: fieldAvail(posts.map((p) => p.bookmarks), hasMapping(dataset, 'content', 'bookmarks')),
    profileVisits: fieldAvail(
      [...posts.map((p) => p.profileVisits), ...overview.map((o) => o.profileVisits)],
      hasMapping(dataset, 'content', 'profileVisits') || hasMapping(dataset, 'overview', 'profileVisits'),
    ),
    follows: fieldAvail(
      [...posts.map((p) => p.follows), ...overview.map((o) => o.follows)],
      hasMapping(dataset, 'content', 'follows') || hasMapping(dataset, 'overview', 'follows'),
    ),
    unfollows: fieldAvail(overview.map((o) => o.unfollows), hasMapping(dataset, 'overview', 'unfollows')),
    engagements: fieldAvail(engagementsPerPost, hasMapping(dataset, 'content', 'likes')),
    engagementRate: engagementRate !== null ? 'available' : 'missing',
  };

  return {
    range,
    totalImpressions,
    dailyAvgImpressions,
    avgImpressionsPerPost,
    medianImpressionsPerPost,
    p90ImpressionsPerPost,
    totalEngagements,
    engagementRate,
    postCount: posts.length,
    avgPostsPerDay,
    totalLikes,
    totalReplies,
    totalReposts,
    totalQuotes,
    totalBookmarks,
    totalProfileVisits,
    totalFollows,
    totalUnfollows,
    netFollowers,
    partialNetFollowers,
    contentDays,
    overviewDays,
    availability,
  };
}

function hasMapping(dataset: Dataset, kind: 'content' | 'overview', key: string): boolean {
  return (dataset.mapping[kind][key as keyof typeof dataset.mapping['content']] ?? undefined) !== undefined;
}

function fieldAvail(values: Array<number | null>, mapped: boolean): MetricAvailability {
  if (!mapped) return 'missing';
  const c = count(values);
  if (c === 0) return 'partial';
  return 'available';
}

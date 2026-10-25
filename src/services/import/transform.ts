/** 原始行 → 结构化记录：字段读取、日期解析、去重、跳过原因统计。 */

import type {
  ContentPost,
  FieldMapping,
  FileKind,
  ImportFileInfo,
  OverviewDay,
  ParseResult,
  SkipReason,
} from '../../types';
import { parseDateCell } from '../../utils/date';
import { parseNumberCell } from '../../utils/format';

const COMPONENT_FIELDS = ['likes', 'replies', 'reposts', 'quotes', 'bookmarks'] as const;

function getCell(row: Record<string, string>, header: string | undefined): string | undefined {
  if (!header) return undefined;
  return row[header];
}

function isEmptyRow(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => v === undefined || v === null || String(v).trim() === '');
}

function pushReason(reasons: SkipReason[], reason: string) {
  const r = reasons.find((x) => x.reason === reason);
  if (r) r.count += 1;
  else reasons.push({ reason, count: 1 });
}

export interface TransformOutput<T> {
  records: T[];
  parsedCount: number;
  skippedCount: number;
  skipReasons: SkipReason[];
  duplicateCount: number;
  dateMin: string | null;
  dateMax: string | null;
  issues: {
    negativeCount: number;
    negativeRows: number[];
    unparsedNumericCount: number;
    zeroImpressionsCount: number;
    engagementsWithoutImpressionsCount: number;
  };
}

/** 行级指标读取：返回各指标值（无法解析 → null）与是否成功读取的标志 */
function readMetrics(row: Record<string, string>, mapping: FieldMapping) {
  const impressions = parseNumberCell(getCell(row, mapping.impressions));
  const likes = parseNumberCell(getCell(row, mapping.likes));
  const replies = parseNumberCell(getCell(row, mapping.replies));
  const reposts = parseNumberCell(getCell(row, mapping.reposts));
  const quotes = parseNumberCell(getCell(row, mapping.quotes));
  const bookmarks = parseNumberCell(getCell(row, mapping.bookmarks));
  const profileVisits = parseNumberCell(getCell(row, mapping.profileVisits));
  const follows = parseNumberCell(getCell(row, mapping.follows));
  const unfollows = parseNumberCell(getCell(row, mapping.unfollows));
  const engagements = parseNumberCell(getCell(row, mapping.engagements));
  const engagementRate = parseNumberCell(getCell(row, mapping.engagementRate));
  const urlClicks = parseNumberCell(getCell(row, mapping.urlClicks));
  const mentions = parseNumberCell(getCell(row, mapping.mentions));

  // 计算互动量：优先对可用分量求和，避免与"互动总量"字段重复计数；
  // 无任何分量字段时，才使用文件提供的互动总量字段。
  const comps = [likes, replies, reposts, quotes, bookmarks];
  const hasAnyComponent = COMPONENT_FIELDS.some((f) => mapping[f] !== undefined);
  let computedEngagements: number | null = null;
  if (hasAnyComponent) {
    let s = 0;
    let any = false;
    for (const c of comps) {
      if (c !== null) {
        s += c;
        any = true;
      }
    }
    if (any) computedEngagements = s;
  } else if (mapping.engagements !== undefined && engagements !== null) {
    computedEngagements = engagements;
  }

  let computedEngagementRate: number | null = null;
  if (impressions !== null && impressions > 0 && computedEngagements !== null) {
    computedEngagementRate = (computedEngagements / impressions) * 100;
  }

  return {
    impressions, likes, replies, reposts, quotes, bookmarks, profileVisits,
    follows, unfollows, engagements, engagementRate, urlClicks, mentions,
    computedEngagements, computedEngagementRate,
  };
}

/** 统计行内数据问题：负数、数字格式异常、零曝光、有互动但无曝光。 */
function collectIssues(
  row: Record<string, string>,
  mapping: FieldMapping,
  metrics: ReturnType<typeof readMetrics>,
  rowIndex: number,
) {
  const issues = {
    negativeCount: 0,
    negativeRows: [] as number[],
    unparsedNumericCount: 0,
    zeroImpressionsCount: 0,
    engagementsWithoutImpressionsCount: 0,
  };
  const cells: Array<[string | undefined, number | null]> = [
    [getCell(row, mapping.impressions), metrics.impressions],
    [getCell(row, mapping.likes), metrics.likes],
    [getCell(row, mapping.replies), metrics.replies],
    [getCell(row, mapping.reposts), metrics.reposts],
    [getCell(row, mapping.quotes), metrics.quotes],
    [getCell(row, mapping.bookmarks), metrics.bookmarks],
    [getCell(row, mapping.profileVisits), metrics.profileVisits],
    [getCell(row, mapping.follows), metrics.follows],
    [getCell(row, mapping.unfollows), metrics.unfollows],
    [getCell(row, mapping.engagements), metrics.engagements],
    [getCell(row, mapping.engagementRate), metrics.engagementRate],
    [getCell(row, mapping.urlClicks), metrics.urlClicks],
    [getCell(row, mapping.mentions), metrics.mentions],
  ];
  for (const [cell, parsed] of cells) {
    if (cell !== undefined && String(cell).trim() !== '' && parsed === null) issues.unparsedNumericCount += 1;
    if (parsed !== null && parsed < 0) {
      issues.negativeCount += 1;
      if (issues.negativeRows.length < 5) issues.negativeRows.push(rowIndex);
    }
  }
  if (metrics.impressions === 0) issues.zeroImpressionsCount += 1;
  if (metrics.computedEngagements !== null && (metrics.impressions === null || metrics.impressions === 0)) {
    issues.engagementsWithoutImpressionsCount += 1;
  }
  return issues;
}

function emptyIssues() {
  return {
    negativeCount: 0,
    negativeRows: [] as number[],
    unparsedNumericCount: 0,
    zeroImpressionsCount: 0,
    engagementsWithoutImpressionsCount: 0,
  };
}

function mergeIssues(
  acc: ReturnType<typeof emptyIssues>,
  issues: ReturnType<typeof collectIssues>,
): ReturnType<typeof emptyIssues> {
  acc.negativeCount += issues.negativeCount;
  acc.negativeRows.push(...issues.negativeRows.slice(0, 5));
  acc.unparsedNumericCount += issues.unparsedNumericCount;
  acc.zeroImpressionsCount += issues.zeroImpressionsCount;
  acc.engagementsWithoutImpressionsCount += issues.engagementsWithoutImpressionsCount;
  return acc;
}

/** 转换 Content CSV（单帖记录）。 */
export function transformContent(parse: ParseResult, mapping: FieldMapping): TransformOutput<ContentPost> {
  const records: ContentPost[] = [];
  const skipReasons: SkipReason[] = [];
  const seenKeys = new Set<string>();
  const issues = emptyIssues();
  let skippedCount = 0;
  let duplicateCount = 0;
  let min: Date | null = null;
  let max: Date | null = null;

  parse.rows.forEach((row, idx) => {
    const rowIndex = idx + 2; // 表头占第 1 行
    if (isEmptyRow(row)) {
      skippedCount += 1;
      pushReason(skipReasons, '整行为空');
      return;
    }
    const postId = (getCell(row, mapping.postId) ?? '').trim() || null;
    const text = (getCell(row, mapping.postText) ?? '').trim();
    const rawDate = (getCell(row, mapping.date) ?? '').trim();
    const date = rawDate ? parseDateCell(rawDate) : null;
    const url = (getCell(row, mapping.postUrl) ?? '').trim() || null;

    // 完全无信息行：无 ID、无正文、无日期且无任何指标
    const metrics = readMetrics(row, mapping);
    const hasAnyMetric =
      metrics.impressions !== null || metrics.likes !== null || metrics.replies !== null ||
      metrics.reposts !== null || metrics.quotes !== null || metrics.bookmarks !== null;
    if (!postId && !text && !date && !hasAnyMetric) {
      skippedCount += 1;
      pushReason(skipReasons, '无有效内容与指标');
      return;
    }
    mergeIssues(issues, collectIssues(row, mapping, metrics, rowIndex));

    // 去重
    const key = postId ?? (date ? date.getTime().toString() : '') + '|' + text.slice(0, 60);
    if (key !== '|' && seenKeys.has(key)) {
      duplicateCount += 1;
      pushReason(skipReasons, '重复记录（保留第一条）');
      return;
    }
    if (key !== '|') seenKeys.add(key);

    const rec: ContentPost = {
      postId, url, text, date, rawDate, rowIndex,
      impressions: metrics.impressions, likes: metrics.likes, replies: metrics.replies,
      reposts: metrics.reposts, quotes: metrics.quotes, bookmarks: metrics.bookmarks,
      profileVisits: metrics.profileVisits, follows: metrics.follows,
      engagements: metrics.engagements, engagementRate: metrics.engagementRate,
      urlClicks: metrics.urlClicks,
      computedEngagements: metrics.computedEngagements,
      computedEngagementRate: metrics.computedEngagementRate,
    };
    records.push(rec);
    if (date) {
      if (!min || date < min) min = date;
      if (!max || date > max) max = date;
    }
  });

  return {
    records,
    parsedCount: records.length,
    skippedCount,
    skipReasons,
    duplicateCount,
    dateMin: min ? fmtD(min) : null,
    dateMax: max ? fmtD(max) : null,
    issues,
  };
}

/** 转换 Overview CSV（每日汇总）。 */
export function transformOverview(parse: ParseResult, mapping: FieldMapping): TransformOutput<OverviewDay> {
  const records: OverviewDay[] = [];
  const skipReasons: SkipReason[] = [];
  const seenDates = new Set<string>();
  const issues = emptyIssues();
  let skippedCount = 0;
  let duplicateCount = 0;
  let min: Date | null = null;
  let max: Date | null = null;

  parse.rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    if (isEmptyRow(row)) {
      skippedCount += 1;
      pushReason(skipReasons, '整行为空');
      return;
    }
    const rawDate = (getCell(row, mapping.date) ?? '').trim();
    const date = rawDate ? parseDateCell(rawDate) : null;
    if (!date) {
      skippedCount += 1;
      pushReason(skipReasons, '缺少可解析的日期');
      return;
    }
    const key = date.getTime().toString();
    if (seenDates.has(key)) {
      duplicateCount += 1;
      pushReason(skipReasons, '重复日期（保留第一条）');
      return;
    }
    seenDates.add(key);

    const metrics = readMetrics(row, mapping);
    mergeIssues(issues, collectIssues(row, mapping, metrics, rowIndex));
    const netFollowers =
      metrics.follows !== null && metrics.unfollows !== null ? metrics.follows - metrics.unfollows : null;

    const rec: OverviewDay = {
      date, rawDate, rowIndex,
      impressions: metrics.impressions, likes: metrics.likes, replies: metrics.replies,
      reposts: metrics.reposts, quotes: metrics.quotes, profileVisits: metrics.profileVisits,
      follows: metrics.follows, unfollows: metrics.unfollows, mentions: metrics.mentions,
      netFollowers,
    };
    records.push(rec);
    if (!min || date < min) min = date;
    if (!max || date > max) max = date;
  });

  return {
    records,
    parsedCount: records.length,
    skippedCount,
    skipReasons,
    duplicateCount,
    dateMin: min ? fmtD(min) : null,
    dateMax: max ? fmtD(max) : null,
    issues,
  };
}

function fmtD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildFileInfo(
  kind: FileKind,
  fileName: string,
  parse: ParseResult,
  output: TransformOutput<unknown>,
  isDemo: boolean,
): ImportFileInfo {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    fileName,
    rowCount: parse.rowCount,
    parsedCount: output.parsedCount,
    skippedCount: output.skippedCount,
    skipReasons: output.skipReasons,
    duplicateCount: output.duplicateCount,
    dateMin: output.dateMin,
    dateMax: output.dateMax,
    headers: parse.headers,
    preview: parse.rows.slice(0, 5),
    importedAt: new Date().toISOString(),
    isDemo,
    rawHeaders: parse.headers,
    issues: output.issues,
  };
}

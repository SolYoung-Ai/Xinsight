/** 分析范围解析：将预设/自定义范围与数据覆盖范围对齐，明确提示超出部分。 */

import type { Dataset } from '../../types';
import { addDays, dateExtent, diffDays, endOfDay, startOfDay } from '../../utils/date';

export interface EffectiveRange {
  requestedStart: Date;
  requestedEnd: Date;
  /** 实际分析起点（与数据覆盖求交后） */
  start: Date;
  /** 实际分析终点 */
  end: Date;
  /** 请求范围是否完全处于数据覆盖范围内 */
  fullyCovered: boolean;
  /** 请求范围与数据覆盖完全没有交集 */
  noCoverage: boolean;
  /** 请求范围内有数据覆盖的自然日数 */
  coverageDays: number;
  /** 数据整体最早/最晚日期 */
  dataMin: Date | null;
  dataMax: Date | null;
}

export function resolveRange(dataset: Dataset, requestedStart: Date, requestedEnd: Date): EffectiveRange {
  const allDates: Date[] = [];
  for (const p of dataset.content) if (p.date) allDates.push(p.date);
  for (const o of dataset.overview) if (o.date) allDates.push(o.date);
  const { min, max } = dateExtent(allDates);

  const reqStart = startOfDay(requestedStart);
  // 请求终点取当天末尾，保证包含请求最后一天全天的记录
  const reqEnd = endOfDay(requestedEnd);

  if (!min || !max) {
    return {
      requestedStart: reqStart,
      requestedEnd: reqEnd,
      start: reqStart,
      end: reqEnd,
      fullyCovered: false,
      noCoverage: true,
      coverageDays: 0,
      dataMin: null,
      dataMax: null,
    };
  }

  const dMin = startOfDay(min);
  const dMax = endOfDay(max);
  const start = reqStart < dMin ? dMin : reqStart > dMax ? dMax : reqStart;
  const end = reqEnd > dMax ? dMax : reqEnd < dMin ? dMin : reqEnd;

  const noCoverage = start > end || reqEnd < dMin || reqStart > dMax;
  const fullyCovered = !noCoverage && dMin <= reqStart && dMax >= reqEnd;

  // 覆盖天数：范围内有数据的自然日数
  const coveredDays = new Set<string>();
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  for (const p of dataset.content) if (p.date && p.date >= start && p.date <= end) coveredDays.add(dayKey(p.date));
  for (const o of dataset.overview) if (o.date && o.date >= start && o.date <= end) coveredDays.add(dayKey(o.date));

  return {
    requestedStart: reqStart,
    requestedEnd: reqEnd,
    start,
    end,
    fullyCovered,
    noCoverage,
    coverageDays: coveredDays.size,
    dataMin: dMin,
    dataMax: dMax,
  };
}

/** 生成 N 天范围（以数据最大日期为终点）。 */
export function presetRange(dataset: Dataset, days: number): { start: Date; end: Date } {
  const allDates: Date[] = [];
  for (const p of dataset.content) if (p.date) allDates.push(p.date);
  for (const o of dataset.overview) if (o.date) allDates.push(o.date);
  const { max } = dateExtent(allDates);
  const end = max ? endOfDay(max) : startOfDay(new Date());
  return { start: addDays(end, -(days - 1)), end };
}

export function rangeLengthDays(start: Date, end: Date): number {
  return diffDays(start, end) + 1;
}

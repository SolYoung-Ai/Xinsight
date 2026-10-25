/** 全局共享类型定义。 */

import type { FieldKey } from '../services/import/fields';

export type FileKind = 'content' | 'overview';

export type FieldMapping = Partial<Record<FieldKey, string>>;

export interface SkipReason {
  reason: string;
  count: number;
}

export interface ImportFileInfo {
  id: string;
  kind: FileKind;
  fileName: string;
  /** PapaParse 解析出的原始行数（含表头） */
  rowCount: number;
  /** 成功转换为记录的数量 */
  parsedCount: number;
  /** 被跳过行数 */
  skippedCount: number;
  skipReasons: SkipReason[];
  /** 重复记录数（仅统计，保留第一条） */
  duplicateCount: number;
  /** 日期覆盖范围（YYYY-MM-DD） */
  dateMin: string | null;
  dateMax: string | null;
  headers: string[];
  /** 预览：前 5 行原始数据 */
  preview: Record<string, string>[];
  importedAt: string;
  isDemo: boolean;
  /** 用于识别/映射的源表头列表（原始写法） */
  rawHeaders: string[];
  /** 行级数据问题统计（供诊断模块使用） */
  issues: {
    negativeCount: number;
    negativeRows: number[];
    unparsedNumericCount: number;
    zeroImpressionsCount: number;
    engagementsWithoutImpressionsCount: number;
  };
}

export interface ContentPost {
  postId: string | null;
  url: string | null;
  text: string;
  date: Date | null;
  /** 原始日期字符串，便于排查解析问题 */
  rawDate: string;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  bookmarks: number | null;
  profileVisits: number | null;
  follows: number | null;
  engagements: number | null;
  engagementRate: number | null;
  urlClicks: number | null;
  /** 原始行号（从 1 开始，对应文件行） */
  rowIndex: number;
  /** 互动量：由本项目按可用字段计算的合计 */
  computedEngagements: number | null;
  /** 互动率（%）：computedEngagements / impressions * 100 */
  computedEngagementRate: number | null;
}

export interface OverviewDay {
  date: Date | null;
  rawDate: string;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  profileVisits: number | null;
  follows: number | null;
  unfollows: number | null;
  mentions: number | null;
  rowIndex: number;
  /** 净增粉丝：follows - unfollows；两者缺一则为 null（不能完整计算） */
  netFollowers: number | null;
}

export interface Dataset {
  content: ContentPost[];
  overview: OverviewDay[];
  contentFile: ImportFileInfo | null;
  overviewFile: ImportFileInfo | null;
  /** 每个文件实际使用的字段映射（应用修改后的最终版本） */
  mapping: { content: FieldMapping; overview: FieldMapping };
  importedAt: string;
}

export type RangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

/** 可用性状态 */
export type MetricAvailability = 'available' | 'missing' | 'partial';

export type StatusLevel = 'ok' | 'watch' | 'warning' | 'insufficient' | 'abnormal' | 'info' | 'unavailable';

export interface InsightItem {
  id: string;
  level: 'info' | 'watch' | 'insufficient' | 'abnormal' | 'unavailable';
  code: string;
  title: string;
  /** 观察到的现象 */
  observation: string;
  /** 支持该现象的数据证据 */
  evidence: string;
  /** 建议的下一步行动 */
  suggestion: string;
  /** 判断局限 */
  limitation: string;
}

export interface QualityFinding {
  id: string;
  severity: 'info' | 'warning' | 'error';
  code: string;
  title: string;
  detail: string;
  /** 涉及的具体记录（节选） */
  records?: string[];
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  errors: { row: number; message: string }[];
}

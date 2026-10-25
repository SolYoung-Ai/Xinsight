/** 集中管理所有阈值，避免散落在组件中。 */

export const THRESHOLDS = {
  /** 单帖统计最低样本（不足则不展示平均/中位数） */
  minPostsForPerPost: 1,
  /** 周期对比最低样本量（低于此值默认提示样本不足） */
  minSamplePerPeriod: 5,
  /** 周期对比建议样本量（满足时才给出确定性较高的结论） */
  preferredSamplePerPeriod: 10,
  /** 曝光中位数下降提示阈值（%） */
  impressionDropPct: 30,
  /** 发帖频率下降提示阈值（%） */
  postFreqDropPct: 30,
  /** 互动率下降提示阈值（%） */
  engagementRateDropPct: 20,
  /** 高表现帖子定义：单帖曝光 >= 中位数 × 该倍数 */
  highPerformerMultiple: 3,
  /** 数据覆盖最短天数（低于则提示范围过短） */
  minRangeDays: 7,
  /** 时间维度分析最低样本（不足不给出时间段结论） */
  minSampleForTimeAnalysis: 10,
  /** 建议样本（时间段分析） */
  preferredSampleForTimeAnalysis: 20,
} as const;

export function pctChangeLabel(n: number | null): string {
  if (n === null) return '无法比较';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/** 运营表现提示：基于统计规则的波动检测，只描述数据变化，不推断平台风控状态。 */

import type { Dataset, InsightItem } from '../../types';
import { median, pct } from '../../utils/math';
import { comparePeriods } from '../analytics/compare';
import { THRESHOLDS } from '../analytics/thresholds';
import type { EffectiveRange } from '../analytics/range';

export function runInsights(dataset: Dataset, range: EffectiveRange): InsightItem[] {
  const items: InsightItem[] = [];
  let id = 0;
  const add = (f: Omit<InsightItem, 'id'>) => {
    items.push({ ...f, id: `i-${id++}` });
  };

  const posts = dataset.content.filter((p) => p.date && p.date >= range.start && p.date <= range.end);
  const comparison = comparePeriods(dataset, range.start, range.end);
  const metricsMissing = !dataset.mapping.content.impressions;

  if (dataset.content.length === 0) {
    add({
      level: 'unavailable',
      code: 'no-content',
      title: '指标不可用',
      observation: '未导入单帖数据（Content CSV）。',
      evidence: '当前只有 Overview 每日汇总数据。',
      suggestion: '导入 X 分析页「内容 Content」标签页导出的 CSV，即可获得曝光、互动、发帖频率等表现提示。',
      limitation: '仅凭每日汇总无法判断单帖表现变化。',
    });
    return items;
  }

  if (metricsMissing) {
    add({
      level: 'unavailable',
      code: 'no-impressions',
      title: '曝光指标不可用',
      observation: 'Content 数据未映射曝光量字段。',
      evidence: '缺少曝光量列，无法计算曝光趋势、中位数与互动率。',
      suggestion: '在数据管理中检查字段映射，为「曝光量」指定正确的列。',
      limitation: '曝光相关提示在本轮数据下无法生成。',
    });
  }

  if (posts.length < THRESHOLDS.minSamplePerPeriod) {
    add({
      level: 'insufficient',
      code: 'sample-insufficient',
      title: '样本不足',
      observation: `当前范围仅 ${posts.length} 条帖子，不足一个周期的对比样本。`,
      evidence: `周期对比要求每个周期至少 ${THRESHOLDS.minSamplePerPeriod} 条帖子（建议 ${THRESHOLDS.preferredSamplePerPeriod} 条）。`,
      suggestion: '扩大时间范围或导入更长周期的数据后重试。',
      limitation: '样本不足时不能给出确定性结论，仅展示原始数据。',
    });
    return items;
  }

  const cur = comparison.current!;
  const prev = comparison.previous!;

  if (!comparison.comparable) {
    add({
      level: 'insufficient',
      code: 'period-not-comparable',
      title: '当前周期与上一周期不具备可比性',
      observation: `上一周期帖子 ${prev.postCount} 条 / 当前周期 ${cur.postCount} 条，未同时满足最低样本。`,
      evidence: `比较范围：${cur.label}；上一等长周期：${prev.label}。`,
      suggestion: '补充数据或调整时间范围后再进行比较。',
      limitation: '样本不足的周期对比不具备统计意义，未生成变化结论。',
    });
    return items;
  }

  // —— 曝光中位数变化 ——
  if (cur.medianImpressions !== null && prev.medianImpressions !== null && prev.medianImpressions > 0) {
    const drop = ((cur.medianImpressions - prev.medianImpressions) / prev.medianImpressions) * 100;
    if (drop <= -THRESHOLDS.impressionDropPct) {
      add({
        level: 'watch',
        code: 'impression-drop',
        title: '观察到曝光中位数明显下降',
        observation: `当前观察到曝光中位数较上一周期下降 ${Math.abs(drop).toFixed(1)}%。这表示数据表现发生了变化，但现有数据不能确定具体原因。`,
        evidence: `曝光中位数：上一周期 ${Math.round(prev.medianImpressions).toLocaleString('zh-CN')} → 当前 ${Math.round(cur.medianImpressions).toLocaleString('zh-CN')}。发帖量：上一周期 ${prev.postCount} 条 → 当前 ${cur.postCount} 条。`,
        suggestion: '建议结合发帖数量、内容主题、时间分布和后续数据继续观察。',
        limitation: '中位数变化是数据现象，不代表平台对账号采取任何措施；也可能是内容差异、发布时间等因素所致。',
      });
    } else if (drop >= THRESHOLDS.impressionDropPct) {
      add({
        level: 'info',
        code: 'impression-rise',
        title: '观察到曝光中位数明显上升',
        observation: `当前曝光中位数较上一周期上升 ${drop.toFixed(1)}%。`,
        evidence: `曝光中位数：上一周期 ${Math.round(prev.medianImpressions).toLocaleString('zh-CN')} → 当前 ${Math.round(cur.medianImpressions).toLocaleString('zh-CN')}。`,
        suggestion: '可对照本期发帖内容、时间与互动情况，识别可能带来改善的因素并保持观察。',
        limitation: '上升同样只是数据现象，不能归因于单一因素。',
      });
    }
  }

  // —— 发帖频率变化 ——
  if (comparison.changes.postCount !== null && comparison.changes.postCount <= -THRESHOLDS.postFreqDropPct) {
    add({
      level: 'watch',
      code: 'posting-frequency-drop',
      title: '发帖数量明显减少',
      observation: `当前周期发帖量较上一周期下降 ${Math.abs(comparison.changes.postCount).toFixed(1)}%。`,
      evidence: `发帖数：上一周期 ${prev.postCount} 条 → 当前 ${cur.postCount} 条（比较范围 ${cur.label}）。`,
      suggestion: '发帖频率变化会直接影响曝光总量。若目标是稳定曝光，可先恢复此前的发帖节奏并观察 1-2 个周期。',
      limitation: '发帖减少本身不构成负面定性，也与平台规则无关。',
    });
  } else if (comparison.changes.postCount !== null && comparison.changes.postCount >= THRESHOLDS.postFreqDropPct) {
    add({
      level: 'info',
      code: 'posting-frequency-rise',
      title: '发帖数量明显增加',
      observation: `当前周期发帖量较上一周期上升 ${comparison.changes.postCount.toFixed(1)}%。`,
      evidence: `发帖数：上一周期 ${prev.postCount} 条 → 当前 ${cur.postCount} 条。`,
      suggestion: '可结合单帖曝光中位数变化判断：发帖增多是否稀释了单帖表现。',
      limitation: '发帖量与表现之间是相关性，不是因果关系。',
    });
  }

  // —— 互动率变化 ——
  if (comparison.changes.engagementRate !== null && comparison.changes.engagementRate <= -THRESHOLDS.engagementRateDropPct) {
    add({
      level: 'watch',
      code: 'engagement-rate-drop',
      title: '互动率出现下降',
      observation: `当前周期互动率较上一周期下降 ${Math.abs(comparison.changes.engagementRate).toFixed(1)}%。`,
      evidence: `互动率：上一周期 ${prev.engagementRate?.toFixed(2) ?? '—'}% → 当前 ${cur.engagementRate?.toFixed(2) ?? '—'}%。互动量：${prev.totalEngagements?.toLocaleString('zh-CN') ?? '—'} → ${cur.totalEngagements?.toLocaleString('zh-CN') ?? '—'}。`,
      suggestion: '可对比本期与上期的内容主题、互动类型分布，观察互动构成的变化。',
      limitation: '互动率为本工具按可用字段计算的口径，可能与 X 分析页展示略有差异。',
    });
  }

  // —— 内容表现差异 ——
  const impressions = posts.map((p) => p.impressions);
  const med = median(impressions);
  const maxImp = pct(impressions, 100);
  if (med !== null && med > 0 && maxImp !== null) {
    const top = posts.filter((p) => p.impressions !== null && p.impressions >= med * THRESHOLDS.highPerformerMultiple);
    const bottom = posts.filter((p) => p.impressions !== null && p.impressions > 0 && p.impressions < med / 3);
    if (top.length > 0 && bottom.length > 0) {
      add({
        level: 'info',
        code: 'content-variance',
        title: '内容表现差异较大',
        observation: `高表现帖子（曝光 ≥ 中位数 × ${THRESHOLDS.highPerformerMultiple}）${top.length} 条，明显低于中位数的 ${bottom.length} 条。`,
        evidence: `单帖曝光中位数 ${Math.round(med).toLocaleString('zh-CN')}；最高 ${Math.round(maxImp).toLocaleString('zh-CN')}。`,
        suggestion: '可结合高表现帖子的正文、话题与发布时间总结共性，但不要把一次爆款直接解释为稳定规律。',
        limitation: '该差异为统计现象，不构成对内容质量的官方评价。',
      });
    }
  }

  // —— 互动与关注不同步 ——
  if (cur.totalEngagements !== null && prev.totalEngagements !== null &&
    comparison.changes.engagements !== null && comparison.changes.engagements >= 20 &&
    cur.follows !== null && prev.follows !== null &&
    comparison.changes.follows !== null && comparison.changes.follows < 10) {
    add({
      level: 'info',
      code: 'engagement-follow-mismatch',
      title: '互动量增长，但新增关注未同步增长',
      observation: `当前周期互动量上升 ${comparison.changes.engagements.toFixed(1)}%，而新增关注仅变化 ${comparison.changes.follows.toFixed(1)}%。`,
      evidence: `新增关注：上一周期 ${prev.follows} → 当前 ${cur.follows}。`,
      suggestion: '可观察高互动帖子的受众是否更偏路人而非潜在关注者；持续对比多周期后再判断趋势。',
      limitation: '互动与关注之间受内容、受众等多因素影响，此处仅报告观察到的不同步现象。',
    });
  }

  // —— 无异常 ——
  if (items.length === 0) {
    add({
      level: 'info',
      code: 'no-notable-change',
      title: '未发现明显变化',
      observation: '当前数据中未发现达到设定阈值的明显变化。',
      evidence: `比较范围 ${cur.label} 与上一等长周期 ${prev.label} 的曝光、发帖、互动指标均未超过提示阈值。`,
      suggestion: '保持现有节奏继续观察，下一周期可对比相同口径数据。',
      limitation: '未发现明显变化仅代表统计阈值内无波动，不构成对账号状态的任何判定。',
    });
  }

  return items;
}

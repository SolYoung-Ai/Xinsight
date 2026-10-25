/** 报告导出：Markdown 报告与 CSV 导出（全部基于当前真实数据）。 */

import type { Dataset, InsightItem, QualityFinding } from '../../types';
import { fmtDate } from '../../utils/date';
import { fmtCompact, fmtPercent } from '../../utils/format';
import type { CoreMetrics } from '../analytics/metrics';
import type { ComparisonResult } from '../analytics/compare';
import type { EffectiveRange } from '../analytics/range';
import { THRESHOLDS } from '../analytics/thresholds';

export interface ReportContext {
  dataset: Dataset;
  range: EffectiveRange;
  metrics: CoreMetrics;
  comparison: ComparisonResult | null;
  insights: InsightItem[];
  quality: QualityFinding[];
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

export function buildMarkdownReport(ctx: ReportContext): string {
  const { dataset, range, metrics, comparison, insights, quality } = ctx;
  const L: string[] = [];
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  L.push('# X Account Insight — 账号运营数据分析报告');
  L.push('');
  L.push(`> 生成时间：${stamp}　|　分析范围：${range.requestedStart.getFullYear()}-${String(range.requestedStart.getMonth() + 1).padStart(2, '0')}-${String(range.requestedStart.getDate()).padStart(2, '0')} ~ ${range.requestedEnd.getFullYear()}-${String(range.requestedEnd.getMonth() + 1).padStart(2, '0')}-${String(range.requestedEnd.getDate()).padStart(2, '0')}`);
  L.push(`> 数据实际覆盖：${range.dataMin ? fmtDate(range.dataMin) : '—'} ~ ${range.dataMax ? fmtDate(range.dataMax) : '—'}${range.fullyCovered ? '' : '（所选范围超出数据覆盖，已按实际数据计算）'}`);
  L.push('');

  // 数据来源
  L.push('## 一、数据来源');
  L.push('');
  L.push('| 文件 | 文件名 | 解析记录 | 日期范围 | 是否模拟数据 |');
  L.push('|---|---|---|---|---|');
  if (dataset.contentFile) {
    L.push(`| Content CSV | ${esc(dataset.contentFile.fileName)} | ${dataset.contentFile.parsedCount} | ${dataset.contentFile.dateMin ?? '—'} ~ ${dataset.contentFile.dateMax ?? '—'} | ${dataset.contentFile.isDemo ? '是' : '否'} |`);
  } else {
    L.push('| Content CSV | 未导入 | — | — | — |');
  }
  if (dataset.overviewFile) {
    L.push(`| Overview CSV | ${esc(dataset.overviewFile.fileName)} | ${dataset.overviewFile.parsedCount} | ${dataset.overviewFile.dateMin ?? '—'} ~ ${dataset.overviewFile.dateMax ?? '—'} | ${dataset.overviewFile.isDemo ? '是' : '否'} |`);
  } else {
    L.push('| Overview CSV | 未导入 | — | — | — |');
  }
  L.push('');
  L.push(`- 导入时间：${dataset.importedAt}`);
  L.push(`- 数据覆盖率：请求范围内有数据的自然日 ${range.coverageDays} 天`);
  L.push('');

  // 核心统计
  L.push('## 二、核心统计指标');
  L.push('');
  const row = (name: string, value: string) => `| ${name} | ${value} |`;
  L.push('| 指标 | 数值 |');
  L.push('|---|---|');
  L.push(row('总曝光量', metrics.totalImpressions !== null ? fmtCompact(metrics.totalImpressions) : '不可用'));
  L.push(row('日均曝光量', metrics.dailyAvgImpressions !== null ? fmtCompact(metrics.dailyAvgImpressions) : '不可用'));
  L.push(row('单帖平均曝光', metrics.avgImpressionsPerPost !== null ? fmtCompact(metrics.avgImpressionsPerPost) : '不可用'));
  L.push(row('单帖曝光中位数', metrics.medianImpressionsPerPost !== null ? fmtCompact(metrics.medianImpressionsPerPost) : '不可用'));
  L.push(row('总互动量', metrics.totalEngagements !== null ? fmtCompact(metrics.totalEngagements) : '不可用'));
  L.push(row('互动率', metrics.engagementRate !== null ? fmtPercent(metrics.engagementRate, 2) : '不可用'));
  L.push(row('总发帖数', String(metrics.postCount)));
  L.push(row('每日平均发帖数', metrics.avgPostsPerDay !== null ? metrics.avgPostsPerDay.toFixed(2) : '不可用'));
  L.push(row('净增粉丝', metrics.netFollowers !== null ? `${metrics.netFollowers > 0 ? '+' : ''}${metrics.netFollowers}` : metrics.partialNetFollowers !== null ? `仅${metrics.partialNetFollowers > 0 ? '新增关注' : '取消关注'}（${metrics.partialNetFollowers}）` : '不可用'));
  L.push(row('主页访问量', metrics.totalProfileVisits !== null ? fmtCompact(metrics.totalProfileVisits) : '不可用'));
  L.push('');

  // 周期比较
  if (comparison && comparison.current && comparison.previous) {
    L.push('## 三、前后周期比较');
    L.push('');
    L.push(`- 当前周期：${comparison.current.label}`);
    L.push(`- 上一等长周期：${comparison.previous.label}`);
    L.push('- 口径：变化率 =（当前 − 上一）÷ 上一 × 100%；上一为 0 或样本不足时显示「无法比较」。');
    L.push('');
    L.push('| 指标 | 上一周期 | 当前周期 | 变化 |');
    L.push('|---|---|---|---|');
    L.push(`| 曝光量 | ${comparison.previous.totalImpressions?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.current.totalImpressions?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.changes.impressions === null ? '无法比较' : `${comparison.changes.impressions > 0 ? '+' : ''}${comparison.changes.impressions.toFixed(1)}%`} |`);
    L.push(`| 发帖数 | ${comparison.previous.postCount} | ${comparison.current.postCount} | ${comparison.changes.postCount === null ? '无法比较' : `${comparison.changes.postCount > 0 ? '+' : ''}${comparison.changes.postCount.toFixed(1)}%`} |`);
    L.push(`| 曝光中位数 | ${comparison.previous.medianImpressions?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.current.medianImpressions?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.changes.medianImpressions === null ? '无法比较' : `${comparison.changes.medianImpressions > 0 ? '+' : ''}${comparison.changes.medianImpressions.toFixed(1)}%`} |`);
    L.push(`| 总互动量 | ${comparison.previous.totalEngagements?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.current.totalEngagements?.toLocaleString('zh-CN') ?? '不可用'} | ${comparison.changes.engagements === null ? '无法比较' : `${comparison.changes.engagements > 0 ? '+' : ''}${comparison.changes.engagements.toFixed(1)}%`} |`);
    L.push(`| 互动率 | ${comparison.previous.engagementRate?.toFixed(2) ?? '不可用'}% | ${comparison.current.engagementRate?.toFixed(2) ?? '不可用'}% | ${comparison.changes.engagementRate === null ? '无法比较' : `${comparison.changes.engagementRate > 0 ? '+' : ''}${comparison.changes.engagementRate.toFixed(1)}%`} |`);
    L.push(`| 净增粉丝 | ${comparison.previous.netFollowers === null ? '不可用' : `${comparison.previous.netFollowers > 0 ? '+' : ''}${comparison.previous.netFollowers}`} | ${comparison.current.netFollowers === null ? '不可用' : `${comparison.current.netFollowers > 0 ? '+' : ''}${comparison.current.netFollowers}`} | ${comparison.changes.netFollowers === null ? '无法比较' : `${comparison.changes.netFollowers > 0 ? '+' : ''}${comparison.changes.netFollowers.toFixed(1)}%`} |`);
    L.push('');
    if (!comparison.comparable) {
      L.push(`> 提示：当前或上一周期帖子数不足 ${THRESHOLDS.minSamplePerPeriod} 条，以上变化仅供参考，不具备确定性结论。`);
      L.push('');
    }
  }

  // 高表现帖子
  L.push('## 四、高表现帖子');
  L.push('');
  const posts = dataset.content
    .filter((p) => p.date && p.date >= range.start && p.date <= range.end && p.impressions !== null)
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 5);
  if (posts.length > 0) {
    L.push('| 排名 | 日期 | 正文摘要 | 曝光 | 点赞 | 互动率 | 链接 |');
    L.push('|---|---|---|---|---|---|---|');
    posts.forEach((p, i) => {
      const text = esc(p.text.slice(0, 60) || '（无正文）');
      const rate = p.computedEngagementRate !== null ? `${p.computedEngagementRate.toFixed(1)}%` : '—';
      const link = p.url ?? (p.postId ? `https://x.com/i/web/status/${p.postId}` : '—');
      L.push(`| ${i + 1} | ${p.date ? fmtDate(p.date) : '—'} | ${text} | ${p.impressions?.toLocaleString('zh-CN') ?? '—'} | ${p.likes?.toLocaleString('zh-CN') ?? '—'} | ${rate} | ${link === '—' ? '—' : link} |`);
    });
  } else {
    L.push('当前范围没有可用的曝光数据。');
  }
  L.push('');

  // 表现变化提示
  L.push('## 五、表现变化提示');
  L.push('');
  if (insights.length === 0) {
    L.push('无。');
  } else {
    insights.forEach((it) => {
      L.push(`- **${it.title}**（${it.code}）`);
      L.push(`  - 观察：${it.observation}`);
      L.push(`  - 依据：${it.evidence}`);
      L.push(`  - 建议：${it.suggestion}`);
      L.push(`  - 局限：${it.limitation}`);
    });
  }
  L.push('');

  // 数据质量问题
  L.push('## 六、数据质量问题');
  L.push('');
  if (quality.length === 0) {
    L.push('未发现明显数据质量问题。');
  } else {
    quality.forEach((q) => {
      L.push(`- **${q.title}** — ${q.detail}`);
    });
  }
  L.push('');

  // 后续观察建议
  L.push('## 七、后续观察建议');
  L.push('');
  if (metrics.postCount === 0) {
    L.push('- 当前范围没有帖子记录，请检查导入数据与所选时间范围。');
  } else {
    L.push(`- 继续按同一口径记录至少 ${THRESHOLDS.preferredSamplePerPeriod} 条帖子/周期，使周期对比结论更可靠。`);
    L.push('- 关注曝光中位数与互动率两个核心口径的变化，而非单次爆款。');
    L.push('- 若导入两份文件，建议每次导出使用相同的日期范围，保持数据口径一致。');
  }
  L.push('');

  // 局限与免责声明
  L.push('## 八、数据局限与免责声明');
  L.push('');
  L.push('- 本报告基于用户主动导入的 CSV 数据，在浏览器本地计算生成；所有口径以本项目说明为准，可能与 X 分析页展示存在差异。');
  L.push('- 互动量 = 可用互动字段合计；互动率 = 互动量 ÷ 曝光量 × 100%。');
  L.push('- 本产品为独立第三方项目，与 X Corp. 无隶属关系，不代表 X 官方结论。');
  L.push('- 报告中的提示基于统计规则，仅描述数据变化，不构成对账号是否被限流、降权、封禁或列入风控的任何判定。');
  L.push('- 报告可能包含你自己的帖子文本与运营数据，分享前请检查个人信息。');
  L.push('');
  L.push('---');
  L.push('由 X Account Insight（X 账号数据体检）生成。');

  return L.join('\n');
}

export function buildPostsCsv(dataset: Dataset, range: EffectiveRange): string {
  const header = ['rowIndex', 'date', 'postId', 'postUrl', 'text', 'impressions', 'likes', 'replies', 'reposts', 'quotes', 'bookmarks', 'engagements', 'engagementRatePct', 'profileVisits', 'follows', 'urlClicks'];
  const rows = dataset.content
    .filter((p) => p.date && p.date >= range.start && p.date <= range.end)
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .map((p) => [
      String(p.rowIndex),
      p.date ? fmtDate(p.date) : '',
      p.postId ?? '',
      p.url ?? '',
      csvCell(p.text),
      n(p.impressions), n(p.likes), n(p.replies), n(p.reposts), n(p.quotes), n(p.bookmarks),
      n(p.computedEngagements),
      p.computedEngagementRate !== null ? p.computedEngagementRate.toFixed(3) : '',
      n(p.profileVisits), n(p.follows), n(p.urlClicks),
    ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function buildOverviewCsv(dataset: Dataset, range: EffectiveRange): string {
  const header = ['date', 'impressions', 'likes', 'replies', 'reposts', 'quotes', 'profileVisits', 'follows', 'unfollows', 'netFollowers', 'mentions'];
  const rows = dataset.overview
    .filter((o) => o.date && o.date >= range.start && o.date <= range.end)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    .map((o) => [
      o.date ? fmtDate(o.date) : '',
      n(o.impressions), n(o.likes), n(o.replies), n(o.reposts), n(o.quotes),
      n(o.profileVisits), n(o.follows), n(o.unfollows), n(o.netFollowers), n(o.mentions),
    ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function n(v: number | null | undefined): string {
  return v === null || v === undefined || !isFinite(v) ? '' : String(v);
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 浏览器下载文本文件。 */
export function downloadText(fileName: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

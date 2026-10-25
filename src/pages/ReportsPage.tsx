import { useMemo } from 'react';
import { Download, FileDown, FileText, Printer } from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { RangeSelector } from '../components/RangeSelector';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { EmptyState } from '../components/ui/State';
import { computeMetrics } from '../services/analytics/metrics';
import { comparePeriods } from '../services/analytics/compare';
import { runInsights } from '../services/diagnostics/insights';
import { runQualityChecks } from '../services/diagnostics/quality';
import { buildMarkdownReport, buildPostsCsv, buildOverviewCsv, downloadText } from '../services/export/report';
import { THRESHOLDS } from '../services/analytics/thresholds';
import { fmtCompact, fmtPercent } from '../utils/format';
import styles from './ReportsPage.module.css';

export function ReportsPage() {
  const { dataset, range, notify } = useData();

  const metrics = useMemo(() => (dataset && range ? computeMetrics(dataset, range) : null), [dataset, range]);
  const comparison = useMemo(() => (dataset && range ? comparePeriods(dataset, range.start, range.end) : null), [dataset, range]);
  const insights = useMemo(() => (dataset && range ? runInsights(dataset, range) : []), [dataset, range]);
  const quality = useMemo(() => (dataset ? runQualityChecks(dataset) : []), [dataset]);

  if (!dataset || !range || !metrics) {
    return <EmptyState title="暂无数据" desc="导入数据后可生成并导出分析报告。" />;
  }

  const stamp = new Date();
  const stampText = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')} ${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`;

  const topPosts = dataset.content
    .filter((p) => p.date && p.date >= range.start && p.date <= range.end && p.impressions !== null)
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 5);

  const handleMarkdown = () => {
    if (!dataset || !range || !metrics) return;
    const md = buildMarkdownReport({ dataset, range, metrics, comparison, insights, quality });
    downloadText(`xai-report-${range.start.getFullYear()}-${String(range.start.getMonth() + 1).padStart(2, '0')}-${String(range.start.getDate()).padStart(2, '0')}.md`, md, 'text/markdown;charset=utf-8');
    notify('Markdown 报告已下载');
  };
  const handlePostsCsv = () => {
    downloadText(`xai-posts-${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')}.csv`, buildPostsCsv(dataset, range), 'text/csv;charset=utf-8');
    notify('帖子分析数据 CSV 已导出');
  };
  const handleOverviewCsv = () => {
    downloadText(`xai-overview-${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')}.csv`, buildOverviewCsv(dataset, range), 'text/csv;charset=utf-8');
    notify('每日汇总数据 CSV 已导出');
  };
  const handlePrint = () => {
    window.print();
  };

  const chgCell = (chg: number | null) =>
    chg === null ? <span className="muted">无法比较</span> : (
      <span className={chg > 0 ? 't-success' : chg < 0 ? 't-danger' : 'muted'}>
        {chg > 0 ? '+' : ''}
        {chg.toFixed(1)}%
      </span>
    );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader
        title="分析报告 Reports"
        desc="生成可导出、可打印的分析报告（全部基于当前实际数据）"
        actions={<RangeSelector />}
      />

      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <Button variant="primary" onClick={handleMarkdown}>
          <FileDown size={15} />
          下载 Markdown 报告
        </Button>
        <Button variant="outline" onClick={handlePostsCsv}>
          <Download size={15} />
          导出帖子分析 CSV
        </Button>
        <Button variant="outline" onClick={handleOverviewCsv}>
          <Download size={15} />
          导出每日汇总 CSV
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={15} />
          打印 / 另存为 PDF
        </Button>
      </div>

      <Notice tone="warning">
        报告可能包含你自己的帖子文本和运营数据（曝光、互动、粉丝变化等）。分享或公开报告前，请检查其中是否包含不想公开的个人信息。
      </Notice>

      <div className={[styles.report, 'print-area'].join(' ')}>
        <h1 className={styles.reportTitle}>X Account Insight — 账号运营数据分析报告</h1>
        <p className={styles.reportMeta}>
          生成时间：{stampText} ｜ 分析范围：{range.start.getFullYear()}-{String(range.start.getMonth() + 1).padStart(2, '0')}-{String(range.start.getDate()).padStart(2, '0')} ~{' '}
          {range.end.getFullYear()}-{String(range.end.getMonth() + 1).padStart(2, '0')}-{String(range.end.getDate()).padStart(2, '0')}
          <br />
          数据实际覆盖：{range.dataMin ? `${range.dataMin.getFullYear()}-${String(range.dataMin.getMonth() + 1).padStart(2, '0')}-${String(range.dataMin.getDate()).padStart(2, '0')}` : '—'} ~{' '}
          {range.dataMax ? `${range.dataMax.getFullYear()}-${String(range.dataMax.getMonth() + 1).padStart(2, '0')}-${String(range.dataMax.getDate()).padStart(2, '0')}` : '—'}
          {range.fullyCovered ? '' : '（所选范围超出数据覆盖，已按实际数据计算）'}
        </p>

        <h2>一、数据来源</h2>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>文件</th>
              <th>文件名</th>
              <th>解析记录</th>
              <th>日期范围</th>
              <th>模拟数据</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Content CSV</td>
              <td>{dataset.contentFile?.fileName ?? '未导入'}</td>
              <td>{dataset.contentFile?.parsedCount ?? '—'}</td>
              <td>{dataset.contentFile?.dateMin ?? '—'} ~ {dataset.contentFile?.dateMax ?? '—'}</td>
              <td>{dataset.contentFile?.isDemo ? '是' : '否'}</td>
            </tr>
            <tr>
              <td>Overview CSV</td>
              <td>{dataset.overviewFile?.fileName ?? '未导入'}</td>
              <td>{dataset.overviewFile?.parsedCount ?? '—'}</td>
              <td>{dataset.overviewFile?.dateMin ?? '—'} ~ {dataset.overviewFile?.dateMax ?? '—'}</td>
              <td>{dataset.overviewFile?.isDemo ? '是' : '否'}</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.reportNote}>导入时间：{dataset.importedAt} ｜ 数据覆盖率：请求范围内有数据的自然日 {range.coverageDays} 天</p>

        <h2>二、核心统计指标</h2>
        <table className={styles.reportTable}>
          <tbody>
            {[
              ['总曝光量', metrics.totalImpressions !== null ? fmtCompact(metrics.totalImpressions) : '不可用'],
              ['日均曝光量', metrics.dailyAvgImpressions !== null ? fmtCompact(metrics.dailyAvgImpressions) : '不可用'],
              ['单帖平均曝光', metrics.avgImpressionsPerPost !== null ? fmtCompact(metrics.avgImpressionsPerPost) : '不可用'],
              ['单帖曝光中位数', metrics.medianImpressionsPerPost !== null ? fmtCompact(metrics.medianImpressionsPerPost) : '不可用'],
              ['总互动量', metrics.totalEngagements !== null ? fmtCompact(metrics.totalEngagements) : '不可用'],
              ['互动率', metrics.engagementRate !== null ? fmtPercent(metrics.engagementRate, 2) : '不可用'],
              ['总发帖数', `${metrics.postCount}`],
              ['每日平均发帖数', metrics.avgPostsPerDay !== null ? metrics.avgPostsPerDay.toFixed(2) : '不可用'],
              ['净增粉丝', metrics.netFollowers !== null ? `${metrics.netFollowers > 0 ? '+' : ''}${metrics.netFollowers}` : metrics.partialNetFollowers !== null ? `仅${metrics.partialNetFollowers > 0 ? '新增关注' : '取消关注'}（${metrics.partialNetFollowers}）` : '不可用'],
              ['主页访问量', metrics.totalProfileVisits !== null ? fmtCompact(metrics.totalProfileVisits) : '不可用'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: 180 }}>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {comparison && comparison.current && comparison.previous ? (
          <>
            <h2>三、前后周期比较</h2>
            <p className={styles.reportNote}>
              当前周期：{comparison.current.label}；上一等长周期：{comparison.previous.label}。变化率 =（当前 − 上一）÷ 上一 × 100%。
            </p>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>指标</th>
                  <th>上一周期</th>
                  <th>当前周期</th>
                  <th>变化</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['曝光量', comparison.previous.totalImpressions, comparison.current.totalImpressions, comparison.changes.impressions, fmtCompact],
                  ['发帖数', comparison.previous.postCount, comparison.current.postCount, comparison.changes.postCount, (n: number) => String(n)],
                  ['曝光中位数', comparison.previous.medianImpressions, comparison.current.medianImpressions, comparison.changes.medianImpressions, fmtCompact],
                  ['总互动量', comparison.previous.totalEngagements, comparison.current.totalEngagements, comparison.changes.engagements, fmtCompact],
                  ['互动率', comparison.previous.engagementRate, comparison.current.engagementRate, comparison.changes.engagementRate, (n: number) => fmtPercent(n, 2)],
                  ['净增粉丝', comparison.previous.netFollowers, comparison.current.netFollowers, comparison.changes.netFollowers, (n: number) => `${n > 0 ? '+' : ''}${n}`],
                ].map(([name, prev, cur, chg, fmt]) => (
                  <tr key={String(name)}>
                    <td>{String(name)}</td>
                    <td>{(prev as number | null) === null ? '不可用' : (fmt as (n: number) => string)(prev as number)}</td>
                    <td>{(cur as number | null) === null ? '不可用' : (fmt as (n: number) => string)(cur as number)}</td>
                    <td>{chgCell(chg as number | null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!comparison.comparable ? (
              <p className={styles.reportNote}>
                提示：当前或上一周期帖子数不足 {THRESHOLDS.minSamplePerPeriod} 条，以上变化仅供参考，不具备确定性结论。
              </p>
            ) : null}
          </>
        ) : null}

        <h2>四、高表现帖子（当前范围 Top 5）</h2>
        {topPosts.length === 0 ? (
          <p>当前范围没有可用的曝光数据。</p>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>日期</th>
                <th>正文摘要</th>
                <th>曝光</th>
                <th>点赞</th>
                <th>互动率</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map((p, i) => (
                <tr key={p.rowIndex}>
                  <td>{i + 1}</td>
                  <td>{p.date ? `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}-${String(p.date.getDate()).padStart(2, '0')}` : '—'}</td>
                  <td>{p.text.slice(0, 48) || '（无正文）'}</td>
                  <td>{p.impressions?.toLocaleString('zh-CN') ?? '—'}</td>
                  <td>{p.likes?.toLocaleString('zh-CN') ?? '—'}</td>
                  <td>{p.computedEngagementRate !== null ? `${p.computedEngagementRate.toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>五、表现变化提示</h2>
        {insights.length === 0 ? (
          <p>无。</p>
        ) : (
          <ul className={styles.reportList}>
            {insights.map((it) => (
              <li key={it.id}>
                <strong>{it.title}</strong>
                <br />观察：{it.observation}
                <br />依据：{it.evidence}
                <br />建议：{it.suggestion}
                <br />局限：{it.limitation}
              </li>
            ))}
          </ul>
        )}

        <h2>六、数据质量问题</h2>
        {quality.length === 0 ? (
          <p>未发现明显数据质量问题。</p>
        ) : (
          <ul className={styles.reportList}>
            {quality.map((q) => (
              <li key={q.id}>
                <strong>{q.title}</strong> — {q.detail}
              </li>
            ))}
          </ul>
        )}

        <h2>七、后续观察建议</h2>
        <ul className={styles.reportList}>
          {metrics.postCount === 0 ? (
            <li>当前范围没有帖子记录，请检查导入数据与所选时间范围。</li>
          ) : (
            <>
              <li>继续按同一口径记录至少 {THRESHOLDS.preferredSamplePerPeriod} 条帖子/周期，使周期对比结论更可靠。</li>
              <li>关注曝光中位数与互动率两个核心口径的变化，而非单次爆款。</li>
              <li>若导入两份文件，建议每次导出使用相同的日期范围，保持数据口径一致。</li>
            </>
          )}
        </ul>

        <h2>八、数据局限与免责声明</h2>
        <ul className={styles.reportList}>
          <li>本报告基于用户主动导入的 CSV 数据，在浏览器本地计算生成；所有口径以本项目说明为准，可能与 X 分析页展示存在差异。</li>
          <li>互动量 = 可用互动字段合计；互动率 = 互动量 ÷ 曝光量 × 100%。</li>
          <li>本产品为独立第三方项目，与 X Corp. 无隶属关系，不代表 X 官方结论。</li>
          <li>报告中的提示基于统计规则，仅描述数据变化，不构成对账号是否被限流、降权、封禁或列入风控的任何判定。</li>
          <li>报告可能包含你自己的帖子文本与运营数据，分享前请检查个人信息。</li>
        </ul>

        <p className={styles.reportFooter}>
          <FileText size={13} style={{ verticalAlign: -2 }} /> 由 X Account Insight（X 账号数据体检）生成 · 报告内容与当前页面数据一致
        </p>
      </div>
    </div>
  );
}

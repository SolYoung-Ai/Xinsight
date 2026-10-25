import { useMemo } from 'react';
import {
  BarChart3,
  Eye,
  FileText,
  Flame,
  Send,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { RangeSelector } from '../components/RangeSelector';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Notice } from '../components/ui/Notice';
import { EmptyState } from '../components/ui/State';
import { LineChart, BarChart } from '../components/charts/Charts';
import { chartPalette } from '../components/charts/theme';
import { computeMetrics } from '../services/analytics/metrics';
import { comparePeriods } from '../services/analytics/compare';
import { buildDailySeries } from '../services/analytics/trends';
import { THRESHOLDS } from '../services/analytics/thresholds';
import { fmtCompact, fmtPercent, fmtSignedInt } from '../utils/format';
import styles from '../styles/ui.module.css';

function delta(chg: number | null): { text: string; dir: 'up' | 'down' | 'flat' | 'na' } {
  if (chg === null) return { text: '较上一周期：无法比较', dir: 'na' };
  if (chg > 0) return { text: `较上一周期 +${chg.toFixed(1)}%`, dir: 'up' };
  if (chg < 0) return { text: `较上一周期 ${chg.toFixed(1)}%`, dir: 'down' };
  return { text: '较上一周期 0%', dir: 'flat' };
}

export function DashboardPage() {
  const { dataset, range, theme } = useData();
  const palette = chartPalette(theme);

  const metrics = useMemo(() => (dataset && range ? computeMetrics(dataset, range) : null), [dataset, range]);
  const comparison = useMemo(
    () => (dataset && range ? comparePeriods(dataset, range.start, range.end) : null),
    [dataset, range],
  );
  const daily = useMemo(() => (dataset && range ? buildDailySeries(dataset, range) : []), [dataset, range]);

  if (!dataset || !range || !metrics) {
    return (
      <EmptyState
        icon={<BarChart3 size={22} />}
        title="暂无数据"
        desc="请先在数据管理中导入 Content / Overview CSV，或加载演示数据。"
      />
    );
  }

  if (range.noCoverage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PageHeader title="总览 Dashboard" />
        <Notice tone="warning">所选时间范围与已导入数据无交集，请调整范围。</Notice>
      </div>
    );
  }

  const a = metrics.availability;
  const chg = comparison?.changes;
  const dailyLabels = daily.map((d) => d.label);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader
        title="总览 Dashboard"
        desc="基于当前已导入数据的核心指标与趋势（口径见帮助说明）"
        actions={<RangeSelector />}
      />

      <div className="grid grid-3">
        <StatCard
          label="总曝光量"
          icon={<Eye size={15} />}
          value={metrics.totalImpressions !== null ? fmtCompact(metrics.totalImpressions) : '暂无数据'}
          delta={chg ? delta(chg.impressions) : undefined}
          hint={
            a.impressions === 'missing'
              ? '需要导入含曝光量字段的 Content CSV，或含每日曝光的 Overview CSV'
              : `覆盖 ${range.coverageDays} 天数据`
          }
        />
        <StatCard
          label="日均曝光量"
          icon={<TrendingUp size={15} />}
          value={metrics.dailyAvgImpressions !== null ? fmtCompact(metrics.dailyAvgImpressions) : '暂无数据'}
          hint={
            a.impressions === 'missing'
              ? '需要曝光量数据'
              : dataset.overview.length > 0
                ? '口径：Overview 每日曝光合计 ÷ 有数据天数'
                : '口径：内容曝光合计 ÷ 有内容天数'
          }
        />
        <StatCard
          label="互动率"
          icon={<Flame size={15} />}
          value={metrics.engagementRate !== null ? fmtPercent(metrics.engagementRate, 2) : '暂无数据'}
          delta={chg ? delta(chg.engagementRate) : undefined}
          hint={
            metrics.engagementRate === null
              ? '需同时具备曝光量与互动字段（点赞/回复/转发/引用/收藏）'
              : '互动量 ÷ 曝光量 × 100%（本工具口径）'
          }
        />
        <StatCard
          label="总发帖数"
          icon={<Send size={15} />}
          value={`${metrics.postCount} 条`}
          delta={chg ? delta(chg.postCount) : undefined}
          hint={metrics.avgPostsPerDay !== null ? `每日平均 ${metrics.avgPostsPerDay.toFixed(2)} 条` : undefined}
        />
        <StatCard
          label="单帖平均曝光"
          icon={<FileText size={15} />}
          size="sm"
          value={metrics.avgImpressionsPerPost !== null ? fmtCompact(metrics.avgImpressionsPerPost) : '暂无数据'}
          hint={
            metrics.medianImpressionsPerPost !== null
              ? `中位数 ${fmtCompact(metrics.medianImpressionsPerPost)} · P90 ${fmtCompact(metrics.p90ImpressionsPerPost)}`
              : '需要单帖曝光数据（Content CSV）'
          }
        />
        <StatCard
          label="净增粉丝"
          icon={<UserPlus size={15} />}
          value={metrics.netFollowers !== null ? fmtSignedInt(metrics.netFollowers) : metrics.partialNetFollowers !== null ? `约 ${fmtSignedInt(metrics.partialNetFollowers)}` : '暂无数据'}
          delta={chg ? delta(chg.netFollowers) : undefined}
          hint={
            metrics.netFollowers !== null
              ? '新增关注 − 取消关注'
              : metrics.partialNetFollowers !== null
                ? '仅有单一字段（新增或取消关注），非完整净增'
                : '需 Overview CSV 提供新增关注与取消关注字段'
          }
        />
      </div>

      <div className="grid grid-2">
        <Card>
          <CardHeader title="每日曝光量趋势" sub="内容曝光（单帖求和）与 Overview 每日曝光对照" />
          <CardBody>
            {a.impressions === 'missing' ? (
              <EmptyState title="曝光指标不可用" desc="导入含曝光量字段的文件后显示趋势。" />
            ) : (
              <LineChart
                labels={dailyLabels}
                palette={palette}
                series={[
                  { label: '内容曝光', data: daily.map((d) => d.impressions) },
                  ...(dataset.overview.length > 0 && a.impressions === 'available'
                    ? [{ label: 'Overview 每日曝光', data: daily.map((d) => d.overviewImpressions), color: palette.series2, dashed: true }]
                    : []),
                ]}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="曝光量与发帖量对比" sub="观察发帖节奏与曝光总量的关系（双轴）" />
          <CardBody>
            <LineChart
              labels={dailyLabels}
              palette={palette}
              series={[
                { label: '曝光量', data: daily.map((d) => d.impressions) },
                {
                  label: '发帖数',
                  data: daily.map((d) => (d.postCount > 0 ? d.postCount : null)),
                  color: palette.series2,
                  dashed: true,
                  yAxisID: 'y1',
                },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="每日互动量趋势" sub="互动量 = 可用互动字段合计（点赞/回复/转发/引用/收藏）" />
          <CardBody>
            {a.engagements === 'missing' ? (
              <EmptyState title="互动指标不可用" desc="需要 Content CSV 中的互动字段。" />
            ) : (
              <LineChart
                labels={dailyLabels}
                palette={palette}
                series={[{ label: '互动量', data: daily.map((d) => d.engagements), color: palette.series2 }]}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="粉丝净增长趋势" sub="新增关注 − 取消关注（Overview 每日）" />
          <CardBody>
            {a.unfollows === 'missing' || a.follows === 'missing' ? (
              <EmptyState
                title="净增粉丝不可用"
                desc={a.follows === 'missing' ? '缺少新增关注字段。' : '缺少取消关注字段（两者齐备才可计算完整净增）。'}
              />
            ) : (
              <BarChart
                labels={dailyLabels}
                palette={palette}
                height={260}
                series={[{ label: '净增粉丝', data: daily.map((d) => d.netFollowers), color: palette.success }]}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="前后周期比较"
          sub={comparison ? `当前周期：${comparison.current?.label}　对比：${comparison.previous?.label}` : undefined}
        />
        <CardBody>
          {comparison && comparison.current && comparison.previous ? (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>指标</th>
                      <th style={{ textAlign: 'right' }}>上一周期</th>
                      <th style={{ textAlign: 'right' }}>当前周期</th>
                      <th style={{ textAlign: 'right' }}>变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: '曝光量', cur: comparison.current.totalImpressions, prev: comparison.previous.totalImpressions, chg: comparison.changes.impressions, fmt: fmtCompact },
                      { name: '发帖数', cur: comparison.current.postCount, prev: comparison.previous.postCount, chg: comparison.changes.postCount, fmt: (n: number) => String(n) },
                      { name: '曝光中位数', cur: comparison.current.medianImpressions, prev: comparison.previous.medianImpressions, chg: comparison.changes.medianImpressions, fmt: fmtCompact },
                      { name: '总互动量', cur: comparison.current.totalEngagements, prev: comparison.previous.totalEngagements, chg: comparison.changes.engagements, fmt: fmtCompact },
                      { name: '互动率', cur: comparison.current.engagementRate, prev: comparison.previous.engagementRate, chg: comparison.changes.engagementRate, fmt: (n: number) => fmtPercent(n, 2) },
                      { name: '净增粉丝', cur: comparison.current.netFollowers, prev: comparison.previous.netFollowers, chg: comparison.changes.netFollowers, fmt: fmtSignedInt },
                    ].map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{r.prev === null ? '不可用' : r.fmt(r.prev)}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{r.cur === null ? '不可用' : r.fmt(r.cur)}</td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {r.chg === null ? (
                            <span className="muted">无法比较</span>
                          ) : (
                            <span className={r.chg > 0 ? 't-success' : r.chg < 0 ? 't-danger' : 'muted'}>
                              {r.chg > 0 ? '+' : ''}
                              {r.chg.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!comparison.comparable ? (
                <Notice tone="muted" style={{ marginTop: 12 }}>
                  当前或上一周期帖子数不足 {THRESHOLDS.minSamplePerPeriod} 条（建议 {THRESHOLDS.preferredSamplePerPeriod} 条），
                  以上变化仅供参考，不具备确定性结论。当对比基数为 0 或缺失时显示「无法比较」。
                </Notice>
              ) : (
                <Notice tone="muted" style={{ marginTop: 12 }}>
                  变化率 =（当前 − 上一）÷ 上一 × 100%；基数为 0、缺失或样本不足时显示「无法比较」。对比基准与口径见帮助。
                </Notice>
              )}
            </>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { RangeSelector } from '../components/RangeSelector';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/State';
import { Segmented } from '../components/ui/Tabs';
import { LineChart, BarChart } from '../components/charts/Charts';
import { chartPalette } from '../components/charts/theme';
import { buildDailySeries, buildWeeklySeries } from '../services/analytics/trends';
import { runInsights } from '../services/diagnostics/insights';
import { publishingByHour, publishingByWeekday } from '../services/analytics/publishing';
import { THRESHOLDS } from '../services/analytics/thresholds';
import uiStyles from '../styles/ui.module.css';

type TZMode = 'local' | 'utc' | '8' | '-5' | '1';

export function TrendsPage() {
  const { dataset, range, theme } = useData();
  const palette = chartPalette(theme);
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');
  const [tzMode, setTzMode] = useState<TZMode>('local');

  const daily = useMemo(() => (dataset && range ? buildDailySeries(dataset, range) : []), [dataset, range]);
  const weekly = useMemo(() => (dataset && range ? buildWeeklySeries(dataset, range) : []), [dataset, range]);
  const insights = useMemo(() => (dataset && range ? runInsights(dataset, range) : []), [dataset, range]);

  const shift = useMemo(() => {
    return (d: Date): Date => {
      if (tzMode === 'local') return d;
      if (tzMode === 'utc') return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + Number(tzMode) * 3600000);
    };
  }, [tzMode]);

  const postsInRange = useMemo(
    () => (dataset && range ? dataset.content.filter((p) => p.date && p.date >= range.start && p.date <= range.end) : []),
    [dataset, range],
  );
  const weekdayStats = useMemo(() => publishingByWeekday(postsInRange, shift), [postsInRange, shift]);
  const hourStats = useMemo(() => publishingByHour(postsInRange, shift), [postsInRange, shift]);
  const hasTime = useMemo(() => postsInRange.some((p) => p.date !== null), [postsInRange]);

  const tzLabel = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区';
    } catch {
      return '本地时区';
    }
  }, []);

  if (!dataset || !range) {
    return <EmptyState title="暂无数据" desc="导入数据后可查看流量趋势分析。" />;
  }

  if (range.noCoverage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PageHeader title="流量趋势 Trends" />
        <EmptyState title="所选范围与数据无交集" desc="请调整时间范围。" />
      </div>
    );
  }

  const labels = granularity === 'day' ? daily.map((d) => d.label) : weekly.map((w) => w.label);
  const impSeries =
    granularity === 'day'
      ? daily.map((d) => d.impressions)
      : weekly.map((w) => w.impressions);
  const engSeries =
    granularity === 'day'
      ? daily.map((d) => d.engagements)
      : weekly.map((w) => w.engagements);
  const erSeries =
    granularity === 'day'
      ? daily.map((d) => d.engagementRate)
      : weekly.map((w) => w.engagementRate);
  const postSeries =
    granularity === 'day'
      ? daily.map((d) => (d.postCount > 0 ? d.postCount : null))
      : weekly.map((w) => w.postCount);

  // 单帖曝光中位数趋势（按日）
  const medSeries = daily.map((d) => {
    const dayPosts = postsInRange.filter((p) => p.date && `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}-${String(p.date.getDate()).padStart(2, '0')}` === d.date);
    const vals = dayPosts.map((p) => p.impressions).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    vals.sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  });

  const watchItems = insights.filter((i) => i.level === 'watch' || i.level === 'insufficient');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader title="流量趋势 Trends" desc="分析账号表现变化（不判断平台内部风控状态）" actions={<RangeSelector />} />

      {watchItems.length > 0 ? (
        <Card>
          <CardHeader title="突发变化检测" sub="基于统计规则的波动提示（阈值集中管理，可配置）" />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {watchItems.map((it) => (
                <div key={it.id} className={uiStyles.notice} style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}>
                  <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2, color: 'var(--warning)' }} />
                  <div>
                    <div style={{ fontWeight: 650 }}>{it.title}</div>
                    <div className="small muted" style={{ marginTop: 2 }}>{it.observation}</div>
                    <div className="small" style={{ marginTop: 4 }}>依据：{it.evidence}</div>
                    <div className="small muted" style={{ marginTop: 2 }}>建议：{it.suggestion}</div>
                    <div className="small" style={{ marginTop: 2, color: 'var(--text-3)' }}>局限：{it.limitation}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={granularity === 'day' ? '每日曝光趋势' : '周度曝光趋势'}
          sub="按日或按周聚合；没有数据的日期会断开，不做补全"
          right={
            <Segmented
              items={[
                { key: 'day', label: '按日' },
                { key: 'week', label: '按周' },
              ]}
              active={granularity}
              onChange={(k) => setGranularity(k as 'day' | 'week')}
            />
          }
        />
        <CardBody>
          <LineChart
            labels={labels}
            palette={palette}
            series={[{ label: granularity === 'day' ? '每日曝光' : '每周曝光', data: impSeries }]}
          />
        </CardBody>
      </Card>

      <div className="grid grid-2">
        <Card>
          <CardHeader title="单帖曝光中位数趋势" sub="每日有发帖日的中位数，避免个别爆款干扰" />
          <CardBody>
            <LineChart labels={daily.map((d) => d.label)} palette={palette} series={[{ label: '中位数曝光', data: medSeries, color: palette.series2 }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="每日互动趋势" sub="互动量 = 可用互动字段合计" />
          <CardBody>
            <LineChart labels={labels} palette={palette} series={[{ label: '互动量', data: engSeries, color: palette.series3 }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="互动率趋势" sub="互动量 ÷ 曝光量 × 100%（每日）" />
          <CardBody>
            {erSeries.every((v) => v === null) ? (
              <EmptyState title="互动率不可用" desc="需要同时具备曝光量与互动字段。" />
            ) : (
              <LineChart
                labels={labels}
                palette={palette}
                yFormat={(v) => `${v.toFixed(2)}%`}
                series={[{ label: '互动率', data: erSeries, color: palette.success }]}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="发帖量与曝光对照" sub="发帖数量变化是否伴随曝光变化" />
          <CardBody>
            <LineChart
              labels={labels}
              palette={palette}
              series={[
                { label: '曝光量', data: impSeries },
                { label: '发帖数', data: postSeries, color: palette.series2, dashed: true, yAxisID: 'y1' },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="账号主页访问趋势" sub="Overview 每日主页访问量" />
          <CardBody>
            {daily.every((d) => d.profileVisits === null) ? (
              <EmptyState title="主页访问不可用" desc="需要 Overview CSV 提供主页访问字段。" />
            ) : (
              <LineChart labels={daily.map((d) => d.label)} palette={palette} series={[{ label: '主页访问', data: daily.map((d) => d.profileVisits), color: palette.series2 }]} />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="新增关注与取消关注趋势" sub="Overview 每日数据；净增 = 新增 − 取消" />
          <CardBody>
            {daily.every((d) => d.follows === null && d.unfollows === null) ? (
              <EmptyState title="关注数据不可用" desc="需要 Overview CSV 提供新增/取消关注字段。" />
            ) : (
              <BarChart
                labels={daily.map((d) => d.label)}
                palette={palette}
                height={240}
                series={[
                  { label: '新增关注', data: daily.map((d) => d.follows), color: palette.success },
                  { label: '取消关注', data: daily.map((d) => d.unfollows), color: palette.danger },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="发帖时间分析"
          sub={`时区：${tzMode === 'local' ? `${tzLabel}（浏览器本地）` : tzMode === 'utc' ? 'UTC' : `UTC${Number(tzMode) > 0 ? '+' : ''}${tzMode}`} — 仅基于真实存在并可解析的发帖时间`}
          right={
            <select
              className={uiStyles.select}
              value={tzMode}
              onChange={(e) => setTzMode(e.target.value as TZMode)}
              aria-label="时区设置"
            >
              <option value="local">浏览器本地时区（{tzLabel}）</option>
              <option value="utc">UTC</option>
              <option value="8">UTC+8</option>
              <option value="1">UTC+1</option>
              <option value="-5">UTC-5</option>
            </select>
          }
        />
        <CardBody>
          {!hasTime ? (
            <EmptyState title="发帖时间不可用" desc="当前数据没有可解析的发帖时间字段，无法进行时间段分析。" />
          ) : postsInRange.length < THRESHOLDS.minSampleForTimeAnalysis ? (
            <EmptyState
              title="样本不足"
              desc={`时间维度分析至少需要 ${THRESHOLDS.minSampleForTimeAnalysis} 条带时间的帖子（建议 ${THRESHOLDS.preferredSampleForTimeAnalysis} 条）。当前 ${postsInRange.length} 条。为避免误导，不推断最佳发布时间。`}
            />
          ) : (
            <div className="grid grid-2">
              <div>
                <div className="small muted" style={{ marginBottom: 8 }}>星期分布（发帖数 + 曝光中位数）</div>
                <BarChart
                  labels={weekdayStats.map((s) => s.label)}
                  palette={palette}
                  height={220}
                  xMaxTicks={7}
                  series={[{ label: '发帖数', data: weekdayStats.map((s) => s.count) }]}
                />
                <div style={{ marginTop: 12 }}>
                  <LineChart
                    labels={weekdayStats.map((s) => s.label)}
                    palette={palette}
                    height={200}
                    xMaxTicks={7}
                    series={[{ label: '曝光中位数', data: weekdayStats.map((s) => s.medianImpressions), color: palette.series2 }]}
                  />
                </div>
              </div>
              <div>
                <div className="small muted" style={{ marginBottom: 8 }}>小时分布（发帖数 + 曝光中位数）</div>
                <BarChart
                  labels={hourStats.map((s) => s.label)}
                  palette={palette}
                  height={220}
                  xMaxTicks={12}
                  series={[{ label: '发帖数', data: hourStats.map((s) => s.count) }]}
                />
                <div style={{ marginTop: 12 }}>
                  <LineChart
                    labels={hourStats.map((s) => s.label)}
                    palette={palette}
                    height={200}
                    xMaxTicks={12}
                    series={[{ label: '曝光中位数', data: hourStats.map((s) => s.medianImpressions), color: palette.series2 }]}
                  />
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="small muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Clock size={14} style={{ flex: 'none', marginTop: 2 }} />
        <span>
          说明：时间分析仅展示统计分布，不推断「最佳发布时间」；样本不足的时段不做结论。
          高表现时段以曝光中位数高于整体中位数、且样本 ≥ {THRESHOLDS.minSampleForTimeAnalysis} 条为准（见发帖分析模块）。
        </span>
      </div>
    </div>
  );
}

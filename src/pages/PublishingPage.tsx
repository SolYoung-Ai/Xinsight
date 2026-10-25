import { useMemo } from 'react';
import { CalendarClock, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { RangeSelector } from '../components/RangeSelector';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/State';
import { Notice } from '../components/ui/Notice';
import { BarChart, LineChart } from '../components/charts/Charts';
import { chartPalette } from '../components/charts/theme';
import { summarizePublishing } from '../services/analytics/publishing';
import { buildWeeklySeries } from '../services/analytics/trends';
import { THRESHOLDS } from '../services/analytics/thresholds';
import { fmtCompact } from '../utils/format';
import uiStyles from '../styles/ui.module.css';

interface Suggestion {
  title: string;
  observation: string;
  evidence: string;
  action: string;
  limitation: string;
}

export function PublishingPage() {
  const { dataset, range, theme } = useData();
  const palette = chartPalette(theme);

  const publishing = useMemo(() => (dataset && range ? summarizePublishing(dataset, range) : null), [dataset, range]);
  const weekly = useMemo(() => (dataset && range ? buildWeeklySeries(dataset, range) : []), [dataset, range]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    if (!publishing || !dataset) return out;

    if (publishing.frequencyChange !== null) {
      const drop = publishing.frequencyChange <= -THRESHOLDS.postFreqDropPct;
      const rise = publishing.frequencyChange >= THRESHOLDS.postFreqDropPct;
      if (drop) {
        out.push({
          title: '发帖频率明显下降',
          observation: '近期周均发帖数较此前明显减少。',
          evidence: `周均发帖：此前 ${publishing.prevPostsPerWeek.toFixed(1)} 条 → 当前 ${publishing.postsPerWeek.toFixed(1)} 条（变化 ${publishing.frequencyChange.toFixed(1)}%）。`,
          action: '若目标是稳定曝光，可先恢复此前的发帖节奏，观察 1–2 个周期后对照曝光总量与中位数变化。',
          limitation: '发帖减少与曝光变化是相关性观察，不构成因果结论。',
        });
      } else if (rise) {
        out.push({
          title: '发帖频率明显上升',
          observation: '近期周均发帖数较此前明显增加。',
          evidence: `周均发帖：此前 ${publishing.prevPostsPerWeek.toFixed(1)} 条 → 当前 ${publishing.postsPerWeek.toFixed(1)} 条（变化 +${publishing.frequencyChange.toFixed(1)}%）。`,
          action: '对照单帖曝光中位数：若中位数下降，可能意味着发帖增多稀释了单帖表现；若持平或上升，节奏可保持。',
          limitation: '发帖量与表现之间是相关性，不是因果关系。',
        });
      }
    }

    if (publishing.bestWeekdays.length > 0) {
      out.push({
        title: '部分星期表现相对更好',
        observation: `曝光中位数高于整体中位数的星期：${publishing.bestWeekdays.join('、')}。`,
        evidence: publishing.bestWeekdays
          .map((w) => {
            const s = publishing.weekdayStats.find((x) => x.label === w);
            return s ? `${w}（${s.count} 条，中位数 ${fmtCompact(s.medianImpressions)}）` : w;
          })
          .join('；'),
        action: '可作为内容排期的参考因子，与内容主题、互动反馈结合观察，不建议仅凭星期做唯一决策。',
        limitation: '星期差异受内容、受众等多因素影响，样本有限时结论不稳定。',
      });
    }
    if (publishing.bestHours.length > 0) {
      out.push({
        title: '部分小时段表现相对更好',
        observation: `曝光中位数高于整体中位数的小时段：${publishing.bestHours.join('、')}。`,
        evidence: publishing.bestHours
          .map((h) => {
            const s = publishing.hourStats.find((x) => x.label === h);
            return s ? `${h}（${s.count} 条，中位数 ${fmtCompact(s.medianImpressions)}）` : h;
          })
          .join('；'),
        action: '可在后续发帖时有意安排一部分帖子进入这些时段做 A/B 观察。',
        limitation: '「表现更好的时段」基于本工具口径的中位数统计，不等于平台官方推荐时段。',
      });
    }

    if (dataset.content.length < THRESHOLDS.preferredSamplePerPeriod) {
      out.push({
        title: '样本量偏少',
        observation: `当前共 ${dataset.content.length} 条帖子，低于建议样本。`,
        evidence: `周期对比建议每个周期至少 ${THRESHOLDS.preferredSamplePerPeriod} 条帖子；时间维度分析建议至少 ${THRESHOLDS.preferredSampleForTimeAnalysis} 条。`,
        action: '导出更长周期的数据，或继续积累数据后再做结论。',
        limitation: '样本不足时只能看原始数据，不建议据此调整运营策略。',
      });
    }

    if (!dataset.mapping.content.impressions) {
      out.push({
        title: '曝光字段未映射',
        observation: 'Content 数据未映射曝光量字段。',
        evidence: '缺少曝光量列，中位数、互动率等指标均不可用。',
        action: '前往「数据管理」检查字段映射，为曝光量指定正确列。',
        limitation: '本轮数据下曝光相关建议无法生成。',
      });
    }
    return out;
  }, [publishing, dataset]);

  if (!dataset || !range || !publishing) {
    return <EmptyState title="暂无数据" desc="导入 Content CSV 后可查看发帖分析。" />;
  }

  const weeklyLabels = weekly.map((w) => w.label);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader title="发帖分析 Publishing" desc="基于实际数据提供简单、可执行的运营建议" actions={<RangeSelector />} />

      <div className="grid grid-3">
        <StatCard
          label="周均发帖数"
          icon={<CalendarClock size={15} />}
          value={`${publishing.postsPerWeek.toFixed(1)} 条`}
          delta={
            publishing.frequencyChange === null
              ? { text: '较此前：无法比较', dir: 'na' }
              : publishing.frequencyChange > 0
                ? { text: `较此前 +${publishing.frequencyChange.toFixed(1)}%`, dir: 'up' }
                : { text: `较此前 ${publishing.frequencyChange.toFixed(1)}%`, dir: 'down' }
          }
          hint="当前范围 ÷ 周数"
        />
        <StatCard
          label="此前周均发帖"
          icon={<TrendingDown size={15} />}
          value={`${publishing.prevPostsPerWeek.toFixed(1)} 条`}
          hint="与当前等长的前一周期"
        />
        <StatCard
          label="整体曝光中位数"
          icon={<TrendingUp size={15} />}
          value={publishing.overallMedian !== null ? fmtCompact(publishing.overallMedian) : '暂无数据'}
          hint="时间/星期分析以此为基准"
        />
      </div>

      <Card>
        <CardHeader title="每周发帖量与曝光量" sub="观察发帖节奏与曝光总量的关系" />
        <CardBody>
          {weekly.length === 0 ? (
            <EmptyState title="无周度数据" desc="调整时间范围后重试。" />
          ) : (
            <LineChart
              labels={weeklyLabels}
              palette={palette}
              series={[
                { label: '每周曝光', data: weekly.map((w) => w.impressions) },
                { label: '每周发帖数', data: weekly.map((w) => w.postCount), color: palette.series2, dashed: true, yAxisID: 'y1' },
              ]}
            />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-2">
        <Card>
          <CardHeader title="星期分布" sub="发帖数（柱）与曝光中位数（折线）" />
          <CardBody>
            <BarChart
              labels={publishing.weekdayStats.map((s) => s.label)}
              palette={palette}
              height={210}
              xMaxTicks={7}
              series={[{ label: '发帖数', data: publishing.weekdayStats.map((s) => s.count) }]}
            />
            <div style={{ marginTop: 10 }}>
              <LineChart
                labels={publishing.weekdayStats.map((s) => s.label)}
                palette={palette}
                height={190}
                xMaxTicks={7}
                series={[{ label: '曝光中位数', data: publishing.weekdayStats.map((s) => s.medianImpressions), color: palette.series2 }]}
              />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="小时分布" sub="发帖数（柱）与曝光中位数（折线）" />
          <CardBody>
            <BarChart
              labels={publishing.hourStats.map((s) => s.label)}
              palette={palette}
              height={210}
              xMaxTicks={12}
              series={[{ label: '发帖数', data: publishing.hourStats.map((s) => s.count) }]}
            />
            <div style={{ marginTop: 10 }}>
              <LineChart
                labels={publishing.hourStats.map((s) => s.label)}
                palette={palette}
                height={190}
                xMaxTicks={12}
                series={[{ label: '曝光中位数', data: publishing.hourStats.map((s) => s.medianImpressions), color: palette.series2 }]}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="高表现时间段"
          sub={`曝光中位数高于整体中位数、且样本 ≥ ${THRESHOLDS.minSampleForTimeAnalysis} 条`}
        />
        <CardBody>
          {publishing.bestWeekdays.length === 0 && publishing.bestHours.length === 0 ? (
            <EmptyState
              title="暂无明显高表现时段"
              desc="当前数据中未找到同时满足「中位数高于整体且样本足够」的星期或小时段。样本不足时不推断最佳发布时间。"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {publishing.bestWeekdays.length > 0 ? (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span className="small muted">星期：</span>
                  {publishing.bestWeekdays.map((w) => (
                    <Badge key={w} tone="accent">{w}</Badge>
                  ))}
                </div>
              ) : null}
              {publishing.bestHours.length > 0 ? (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span className="small muted">小时段：</span>
                  {publishing.bestHours.map((h) => (
                    <Badge key={h} tone="accent">{h}</Badge>
                  ))}
                </div>
              ) : null}
              <p className="small muted" style={{ margin: 0 }}>
                这些时段基于当前数据的统计分布得出，不构成平台官方推荐；请结合内容与互动继续观察。
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="运营建议" sub="每一条建议均与数据直接关联：现象 → 依据 → 行动 → 局限" />
        <CardBody>
          {suggestions.length === 0 ? (
            <Notice tone="muted">当前数据未产生可执行的运营建议。导入更完整的数据（含曝光与互动字段）后可获得更多建议。</Notice>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestions.map((s, i) => (
                <div key={i} className={uiStyles.notice} style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}>
                  <Lightbulb size={16} style={{ flex: 'none', marginTop: 2, color: 'var(--accent-text)' }} />
                  <div>
                    <div style={{ fontWeight: 650 }}>{i + 1}. {s.title}</div>
                    <div className="small" style={{ marginTop: 3 }}><strong>观察：</strong>{s.observation}</div>
                    <div className="small muted"><strong>依据：</strong>{s.evidence}</div>
                    <div className="small"><strong>行动：</strong>{s.action}</div>
                    <div className="small" style={{ color: 'var(--text-3)' }}><strong>局限：</strong>{s.limitation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="small muted" style={{ margin: '12px 0 0' }}>
            说明：本模块仅描述数据中的相关性现象，不使用未经验证的「算法权重公式」，不声称掌握未公开的推荐规则。
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

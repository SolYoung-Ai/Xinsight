import { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, Info, Stethoscope } from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { RangeSelector } from '../components/RangeSelector';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/State';
import { Notice } from '../components/ui/Notice';
import { runQualityChecks } from '../services/diagnostics/quality';
import { runInsights } from '../services/diagnostics/insights';
import type { StatusLevel } from '../types';
import uiStyles from '../styles/ui.module.css';

const LEVEL_META: Record<StatusLevel, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'outline'; desc: string }> = {
  ok: { label: '数据充分', tone: 'success', desc: '字段、样本量与日期覆盖均满足当前分析所需。' },
  watch: { label: '需要观察', tone: 'warning', desc: '检测到达到设定阈值的波动，建议继续观察并对照数据。' },
  warning: { label: '需要观察', tone: 'warning', desc: '检测到达到设定阈值的波动，建议继续观察并对照数据。' },
  insufficient: { label: '样本不足', tone: 'info', desc: '数据量不足以支撑确定性结论，仅展示原始数据。' },
  abnormal: { label: '数据异常', tone: 'danger', desc: '发现数据质量问题（如负数、字段缺失），建议核对原始文件。' },
  info: { label: '提示', tone: 'info', desc: '观察到值得关注的变化，可作为下一步运营的参考。' },
  unavailable: { label: '指标不可用', tone: 'outline', desc: '缺少必要字段，相关指标无法计算。' },
};

export function DiagnosticsPage() {
  const { dataset, range } = useData();

  const quality = useMemo(() => (dataset ? runQualityChecks(dataset) : []), [dataset]);
  const insights = useMemo(() => (dataset && range ? runInsights(dataset, range) : []), [dataset, range]);

  const level = useMemo<StatusLevel>(() => {
    if (!dataset) return 'unavailable';
    const hasError = quality.some((q) => q.severity === 'error');
    const hasWarning = quality.some((q) => q.severity === 'warning');
    const hasInsufficient = insights.some((i) => i.level === 'insufficient');
    const hasWatch = insights.some((i) => i.level === 'watch');
    if (hasError) return 'warning';
    if (hasInsufficient) return 'insufficient';
    if (hasWarning) return 'abnormal';
    if (hasWatch) return 'watch';
    return 'ok';
  }, [dataset, quality, insights]);

  const meta = LEVEL_META[level];

  if (!dataset) {
    return <EmptyState icon={<Database size={22} />} title="暂无数据" desc="导入数据后即可执行数据完整性检测与运营表现诊断。" />;
  }

  const severityIcon = (s: string) =>
    s === 'error' ? <AlertTriangle size={15} style={{ color: 'var(--danger)' }} /> : s === 'warning' ? <AlertTriangle size={15} style={{ color: 'var(--warning)' }} /> : <Info size={15} style={{ color: 'var(--info)' }} />;

  const insightTone = (l: string) =>
    l === 'watch' || l === 'abnormal' ? 'warning' as const : l === 'insufficient' ? 'info' as const : l === 'unavailable' ? 'outline' as const : 'success' as const;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader
        title="数据诊断 Diagnostics"
        desc="这里诊断的是「数据」与「运营表现」，不检测 X 内部安全机制"
        actions={<RangeSelector />}
      />

      <Card>
        <CardBody>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <Stethoscope size={20} style={{ color: 'var(--accent-text)' }} />
            <div>
              <div className="row" style={{ gap: 8 }}>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="small muted">当前诊断结果等级</span>
              </div>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{meta.desc}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="数据完整性检测"
          sub="字段缺失、日期连续性、重复记录、异常值与样本量检查"
          right={<Badge tone={quality.some((q) => q.severity === 'warning' || q.severity === 'error') ? 'warning' : 'success'}>{quality.length} 项检查结果</Badge>}
        />
        <CardBody>
          {quality.length === 0 ? (
            <EmptyState title="未发现明显数据质量问题" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quality.map((q) => (
                <div key={q.id} className={uiStyles.notice} style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}>
                  {severityIcon(q.severity)}
                  <div>
                    <div style={{ fontWeight: 650 }}>{q.title}</div>
                    <div className="small muted" style={{ marginTop: 2 }}>{q.detail}</div>
                    {q.records && q.records.length > 0 ? (
                      <div className="small mono" style={{ marginTop: 4, color: 'var(--text-3)' }}>
                        {q.records.join('；')}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="运营表现提示"
          sub="每个提示均显示计算依据与比较范围"
          right={<Badge tone={insights.length > 0 && insights.some((i) => i.level !== 'info') ? 'warning' : 'success'}>{insights.length} 条提示</Badge>}
        />
        <CardBody>
          {insights.length === 0 ? (
            <EmptyState title="暂无提示" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map((it) => (
                <div key={it.id} className={uiStyles.notice} style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}>
                  <Activity size={16} style={{ flex: 'none', marginTop: 2, color: 'var(--accent-text)' }} />
                  <div>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 650 }}>{it.title}</span>
                      <Badge tone={insightTone(it.level)}>{it.level === 'info' ? '无异常' : it.level === 'watch' ? '需要观察' : it.level === 'insufficient' ? '样本不足' : it.level === 'abnormal' ? '异常' : '不可用'}</Badge>
                    </div>
                    <div className="small" style={{ marginTop: 3 }}>{it.observation}</div>
                    <div className="small muted"><strong>依据：</strong>{it.evidence}</div>
                    <div className="small"><strong>建议：</strong>{it.suggestion}</div>
                    <div className="small" style={{ color: 'var(--text-3)' }}><strong>局限：</strong>{it.limitation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Notice tone="muted">
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckCircle2 size={15} style={{ flex: 'none', marginTop: 1 }} />
          <span className="small">
            重要边界：本模块只报告「数据现象」。未发现明显变化时文案为「当前数据中未发现达到设定阈值的明显变化」，
            而非「账号状态正常」或「未被限流」。本工具不检测、不判定 Shadowban、限流、降权、封禁或风控状态——
            这些需要平台内部数据，仅凭 CSV 无法确认。
          </span>
        </div>
      </Notice>
    </div>
  );
}

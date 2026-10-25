import { CalendarRange } from 'lucide-react';
import { useData } from '../state/DataContext';
import { Chip, Segmented } from './ui/Tabs';
import { Notice } from './ui/Notice';
import styles from '../styles/ui.module.css';

export function RangeSelector() {
  const { rangePreset, setRangePreset, customRange, setCustomRange, range, resetRangeToPreset } = useData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <CalendarRange size={16} style={{ color: 'var(--text-3)' }} />
        <Segmented
          items={[
            { key: '7d', label: '近 7 天' },
            { key: '30d', label: '近 30 天' },
            { key: '90d', label: '近 90 天' },
            { key: 'custom', label: '自定义' },
          ]}
          active={rangePreset}
          onChange={(k) => {
            setRangePreset(k as '7d' | '30d' | '90d' | 'custom');
            if (k !== 'custom' && customRange.start) resetRangeToPreset();
          }}
        />
        {rangePreset === 'custom' ? (
          <span className="row">
            <input
              type="date"
              className={styles.input}
              style={{ width: 140 }}
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              aria-label="开始日期"
            />
            <span className="muted">至</span>
            <input
              type="date"
              className={styles.input}
              style={{ width: 140 }}
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              aria-label="结束日期"
            />
          </span>
        ) : null}
      </div>
      {range ? (
        <div className="small muted">
          实际计算范围：{range.start.getFullYear()}-{String(range.start.getMonth() + 1).padStart(2, '0')}-
          {String(range.start.getDate()).padStart(2, '0')} ~ {range.end.getFullYear()}-
          {String(range.end.getMonth() + 1).padStart(2, '0')}-{String(range.end.getDate()).padStart(2, '0')}
          {range.fullyCovered ? '' : '（所选范围超出数据覆盖，已按实际数据计算，未补全不存在的数据）'}
          {range.noCoverage ? ' — 所选范围与数据无交集' : ''}
        </div>
      ) : null}
      {range?.noCoverage ? (
        <Notice tone="warning">
          当前所选时间范围与已导入数据没有任何交集，图表将为空。请调整范围或检查数据日期。
        </Notice>
      ) : null}
    </div>
  );
}

export function RangeChips() {
  const { rangePreset, setRangePreset } = useData();
  return (
    <div className="row">
      {[
        { k: '7d', label: '7天' },
        { k: '30d', label: '30天' },
        { k: '90d', label: '90天' },
      ].map((o) => (
        <Chip key={o.k} active={rangePreset === o.k} onClick={() => setRangePreset(o.k as '7d' | '30d' | '90d')}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

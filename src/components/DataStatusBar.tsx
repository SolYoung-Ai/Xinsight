import { Database } from 'lucide-react';
import { useData } from '../state/DataContext';
import { Badge } from './ui/Badge';

export function DataStatusBar() {
  const { dataset, rangePreset } = useData();

  if (!dataset) {
    return (
      <Badge tone="outline">
        <Database size={12} />
        尚未导入数据
      </Badge>
    );
  }
  const parts: string[] = [];
  if (dataset.content.length > 0) parts.push(`已导入 ${dataset.content.length} 条帖子记录`);
  if (dataset.overview.length > 0) parts.push(`每日数据 ${dataset.overview.length} 天`);
  const rangeLabel =
    rangePreset === '7d' ? '近 7 天' : rangePreset === '30d' ? '近 30 天' : rangePreset === '90d' ? '近 90 天' : '自定义范围';
  return (
    <span className="row" style={{ gap: 6 }}>
      <Badge tone="success">{parts.join(' · ')}</Badge>
      <Badge tone="muted">当前分析范围：{rangeLabel}</Badge>
    </span>
  );
}

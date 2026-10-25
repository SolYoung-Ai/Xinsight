import { Bar, Line } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { compactTick, type ChartPalette } from './theme';

export interface Series {
  label: string;
  data: Array<number | null>;
  color?: string;
  fill?: boolean;
  dashed?: boolean;
  yAxisID?: string;
}

export function LineChart({
  labels,
  series,
  height = 280,
  yFormat,
  xMaxTicks,
  palette,
  spanGaps = false,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  yFormat?: (v: number) => string;
  xMaxTicks?: number;
  palette: ChartPalette;
  spanGaps?: boolean;
}) {
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: s.color ?? (i === 0 ? palette.accent : i === 1 ? palette.series2 : palette.series3),
      backgroundColor: s.fill ?? i === 0 ? (s.color ?? palette.accent) : undefined,
      fill: s.fill ?? false,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 8,
      tension: 0.25,
      borderDash: s.dashed ? [5, 4] : undefined,
      spanGaps,
      yAxisID: s.yAxisID ?? 'y',
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 320 },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: palette.ticks,
          maxTicksLimit: xMaxTicks ?? 12,
          maxRotation: 0,
          autoSkip: true,
        },
        border: { color: palette.border },
      },
      y: {
        grid: { color: palette.grid },
        ticks: {
          color: palette.ticks,
          callback: (v) => (typeof v === 'number' ? compactTick(v) : v),
        },
        border: { display: false },
      },
      ...(series.some((s) => s.yAxisID === 'y1')
        ? {
            y1: {
              position: 'right' as const,
              grid: { drawOnChartArea: false },
              ticks: {
                color: palette.ticks,
                callback: (v) => (typeof v === 'number' ? compactTick(v) : v),
              },
              border: { display: false },
            },
          }
        : {}),
    },
    plugins: {
      legend: {
        labels: { color: palette.legend, usePointStyle: true, boxWidth: 7, boxHeight: 7 },
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.tooltipText,
        bodyColor: palette.tooltipText,
        padding: 10,
        cornerRadius: 10,
        displayColors: true,
        callbacks: {
          label: (item: TooltipItem<'line'>) => {
            const raw = item.raw as number | null;
            if (raw === null || raw === undefined || !isFinite(raw)) return `${item.dataset.label}: 无数据`;
            return `${item.dataset.label}: ${yFormat ? yFormat(raw) : raw.toLocaleString('zh-CN')}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

export function BarChart({
  labels,
  series,
  height = 280,
  yFormat,
  xMaxTicks,
  palette,
  horizontal = false,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  yFormat?: (v: number) => string;
  xMaxTicks?: number;
  palette: ChartPalette;
  horizontal?: boolean;
}) {
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color ?? (i === 0 ? palette.accent : palette.series2),
      borderRadius: 4,
      maxBarThickness: 26,
    })),
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 320 },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: palette.ticks,
          maxTicksLimit: xMaxTicks ?? 12,
          maxRotation: 0,
          autoSkip: true,
        },
        border: { color: palette.border },
      },
      y: {
        grid: { color: palette.grid },
        ticks: {
          color: palette.ticks,
          callback: (v) => (typeof v === 'number' ? compactTick(v) : v),
        },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        labels: { color: palette.legend, usePointStyle: true, boxWidth: 7, boxHeight: 7 },
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.tooltipText,
        bodyColor: palette.tooltipText,
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const raw = item.raw as number | null;
            if (raw === null || raw === undefined || !isFinite(raw)) return `${item.dataset.label}: 无数据`;
            return `${item.dataset.label}: ${yFormat ? yFormat(raw) : raw.toLocaleString('zh-CN')}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height, position: 'relative' }}>
      <Bar data={data} options={options} />
    </div>
  );
}


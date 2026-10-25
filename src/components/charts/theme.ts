/** 图表配色：随主题变化。 */
export interface ChartPalette {
  accent: string;
  accentSoft: string;
  grid: string;
  ticks: string;
  border: string;
  series2: string;
  series3: string;
  success: string;
  danger: string;
  legend: string;
  tooltipBg: string;
  tooltipText: string;
}

export function chartPalette(theme: 'light' | 'dark'): ChartPalette {
  if (theme === 'dark') {
    return {
      accent: '#E0703A',
      accentSoft: 'rgba(224,112,58,0.16)',
      grid: 'rgba(255,255,255,0.07)',
      ticks: '#8A8175',
      border: '#453C30',
      series2: '#8FA8C4',
      series3: '#B5AA9B',
      success: '#63B383',
      danger: '#D46A5E',
      legend: '#B5AA9B',
      tooltipBg: '#2A241C',
      tooltipText: '#F1EAE1',
    };
  }
  return {
    accent: '#C14B1D',
    accentSoft: 'rgba(193,75,29,0.12)',
    grid: 'rgba(34,29,23,0.08)',
    ticks: '#A39A8E',
    border: '#D7CDBD',
    series2: '#5B7A9D',
    series3: '#9A8F7E',
    success: '#2E7D4F',
    danger: '#B3382C',
    legend: '#6B635A',
    tooltipBg: '#221D17',
    tooltipText: '#FAF6F0',
  };
}

export function compactTick(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}亿`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(1).replace(/\.0$/, '')}万`;
  return String(n);
}

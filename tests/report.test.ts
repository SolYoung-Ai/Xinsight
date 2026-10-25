import { describe, expect, it } from 'vitest';
import { buildDataset, SAMPLE_CONTENT, SAMPLE_OVERVIEW } from './helpers';
import { buildMarkdownReport, buildPostsCsv, buildOverviewCsv } from '../src/services/export/report';
import { computeMetrics } from '../src/services/analytics/metrics';
import { comparePeriods } from '../src/services/analytics/compare';
import { runInsights } from '../src/services/diagnostics/insights';
import { runQualityChecks } from '../src/services/diagnostics/quality';
import { presetRange, resolveRange } from '../src/services/analytics/range';
import { generateDemoContentCsv, generateDemoOverviewCsv } from '../src/services/demo';
import { parseCsvText } from '../src/services/import/csv';
import { autoMap } from '../src/services/import/fields';
import { transformContent, transformOverview, buildFileInfo } from '../src/services/import/transform';
import { serialize, deserialize } from '../src/services/storage';

function rng(ds: ReturnType<typeof buildDataset>, days = 12) {
  const r = presetRange(ds, days);
  return resolveRange(ds, r.start, r.end);
}

describe('报告导出', () => {
  it('Markdown 报告内容与实际计算结果一致', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const range = rng(ds, 12);
    const metrics = computeMetrics(ds, range);
    const comparison = comparePeriods(ds, range.start, range.end);
    const md = buildMarkdownReport({ dataset: ds, range, metrics, comparison, insights: [], quality: [] });

    // 数字一致性：总曝光 14,300
    expect(md).toContain('14,300');
    expect(md).toContain('12');
    // 免责声明与范围
    expect(md).toContain('独立第三方');
    expect(md).toContain('X Corp');
    expect(md).toContain('2025-03-01');
  });

  it('报告包含数据来源、覆盖率、质量与观察建议', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const range = rng(ds, 12);
    const metrics = computeMetrics(ds, range);
    const comparison = comparePeriods(ds, range.start, range.end);
    const insights = runInsights(ds, range);
    const quality = runQualityChecks(ds);
    const md = buildMarkdownReport({ dataset: ds, range, metrics, comparison, insights, quality });
    for (const key of ['数据来源', '覆盖率', '核心统计', '高表现帖子', '数据质量', '后续观察', '局限']) {
      expect(md).toContain(key);
    }
  });

  it('演示数据报告明确标注为模拟数据，不与真实数据混用', () => {
    const demoContent = generateDemoContentCsv(20261025, 30, 5);
    const demoOverview = generateDemoOverviewCsv(20261025, 30, 5);
    const contentParse = parseCsvText(demoContent);
    const overviewParse = parseCsvText(demoOverview);
    const contentOut = transformContent(contentParse, autoMap(contentParse.headers));
    const overviewOut = transformOverview(overviewParse, autoMap(overviewParse.headers));
    const ds = {
      content: contentOut.records,
      overview: overviewOut.records,
      contentFile: buildFileInfo('content', 'demo_content.csv', contentParse, contentOut, true),
      overviewFile: buildFileInfo('overview', 'demo_overview.csv', overviewParse, overviewOut, true),
      mapping: { content: autoMap(contentParse.headers), overview: autoMap(overviewParse.headers) },
      importedAt: new Date().toISOString(),
    };
    const range = rng(ds, 7);
    const metrics = computeMetrics(ds, range);
    const md = buildMarkdownReport({
      dataset: ds,
      range,
      metrics,
      comparison: null,
      insights: runInsights(ds, range),
      quality: runQualityChecks(ds),
    });
    expect(md).toContain('模拟数据');
    expect(ds.contentFile!.isDemo).toBe(true);
    expect(ds.overviewFile!.isDemo).toBe(true);
  });

  it('CSV 导出包含表头与数据', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const range = rng(ds, 12);
    const postsCsv = buildPostsCsv(ds, range);
    const lines = postsCsv.split('\n');
    expect(lines[0]).toContain('impressions');
    expect(lines.length).toBe(13); // 表头 + 12 条
    const overviewCsv = buildOverviewCsv(ds, range);
    expect(overviewCsv.split('\n')[0]).toContain('date');
  });

  it('导出范围与当前范围一致（不含范围外记录）', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const range = rng(ds, 6);
    const postsCsv = buildPostsCsv(ds, range);
    expect(postsCsv.split('\n').length).toBe(7); // 表头 + 6 条
  });
});

describe('本地持久化', () => {
  it('Date 序列化往返一致', () => {
    const ds = buildDataset(SAMPLE_CONTENT, SAMPLE_OVERVIEW);
    const state = { enabled: true, dataset: ds, savedAt: new Date().toISOString() };
    const revived = deserialize(serialize(state));
    const revDs = revived.dataset!;
    expect(revDs.content[0].date).toBeInstanceOf(Date);
    expect(revDs.content[0].postId).toBe(ds.content[0].postId);
    expect(revDs.overview[0].date).toBeInstanceOf(Date);
  });
});

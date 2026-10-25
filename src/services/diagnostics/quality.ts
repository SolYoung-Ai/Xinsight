/** 数据完整性检测：字段缺失、日期连续性、重复、异常值、样本量等。 */

import type { Dataset, QualityFinding } from '../../types';
import { fmtDate, parseDateCell } from '../../utils/date';
import { count } from '../../utils/math';
import { THRESHOLDS } from '../analytics/thresholds';

export function runQualityChecks(dataset: Dataset): QualityFinding[] {
  const findings: QualityFinding[] = [];
  let id = 0;
  const add = (f: Omit<QualityFinding, 'id'>) => {
    findings.push({ ...f, id: `q-${id++}` });
  };

  const cf = dataset.contentFile;
  const of = dataset.overviewFile;

  if (!cf && !of) {
    add({
      severity: 'error',
      code: 'no-data',
      title: '尚未导入任何数据',
      detail: '请先导入 Content CSV（单帖表现）或 Overview CSV（每日整体表现），导入后即可进行分析。',
    });
    return findings;
  }

  // —— 文件级 ——
  if (!cf) {
    add({
      severity: 'warning',
      code: 'missing-content',
      title: '未导入内容数据（Content CSV）',
      detail: '单帖曝光、互动、排行榜与发帖时间分析需要 Content CSV，当前仅可分析 Overview 每日汇总指标。',
    });
  }
  if (!of) {
    add({
      severity: 'info',
      code: 'missing-overview',
      title: '未导入每日整体数据（Overview CSV）',
      detail: '每日净增粉丝、取消关注与主页访问趋势需要 Overview CSV；内容曝光趋势仍可基于 Content CSV 计算。',
    });
  }

  // —— 内容文件字段 ——
  if (cf) {
    const m = dataset.mapping.content;
    if (!m.date) add({ severity: 'warning', code: 'content-no-date', title: '内容数据缺少日期字段', detail: '没有日期字段时，无法进行趋势、周期比较与发帖时间分析。请在字段映射中指定日期列。' });
    if (!m.impressions) add({ severity: 'warning', code: 'content-no-impressions', title: '内容数据缺少曝光量字段', detail: '缺少曝光量时，曝光趋势、中位数与互动率均无法计算。请在字段映射中指定曝光列。' });
    const hasEng = [m.likes, m.replies, m.reposts, m.quotes, m.bookmarks, m.engagements].some((x) => x !== undefined);
    if (!hasEng) add({ severity: 'info', code: 'content-no-engagements', title: '内容数据缺少互动字段', detail: '没有点赞/回复/转发/引用/收藏等字段时，互动量分析与互动率无法计算。' });
    if (!m.postText && !m.postId) add({ severity: 'info', code: 'content-no-identity', title: '内容数据缺少正文或 ID', detail: '帖子列表只能显示指标，无法展示正文或生成帖子链接。' });

    if (cf.skippedCount > 0) {
      add({
        severity: 'info',
        code: 'content-skipped',
        title: `内容数据跳过了 ${cf.skippedCount} 条记录`,
        detail: `原因：${cf.skipReasons.map((r) => `${r.reason}（${r.count} 条）`).join('；') || '未知'}`,
      });
    }
    if (cf.duplicateCount > 0) {
      add({
        severity: 'info',
        code: 'content-duplicates',
        title: `检测到 ${cf.duplicateCount} 条重复记录`,
        detail: '重复记录已自动去重并保留第一条，未计入统计。',
      });
    }
    if (cf.issues.negativeCount > 0) {
      add({
        severity: 'warning',
        code: 'negative-values',
        title: `检测到 ${cf.issues.negativeCount} 处负数指标`,
        detail: `负数在运营指标中通常属于数据异常。涉及行：${cf.issues.negativeRows.join('、') || '多行'}。请核对原始文件。`,
      });
    }
    if (cf.issues.unparsedNumericCount > 0) {
      add({
        severity: 'info',
        code: 'unparsed-numbers',
        title: `${cf.issues.unparsedNumericCount} 处数字格式无法解析`,
        detail: '这些单元格被当作缺失值处理（显示为不可用），不会以 0 填充。请检查是否存在百分比文本、千分位以外的格式。',
      });
    }
    if (cf.issues.zeroImpressionsCount > 0) {
      add({
        severity: 'info',
        code: 'zero-impressions',
        title: `${cf.issues.zeroImpressionsCount} 条帖子曝光量为 0`,
        detail: '曝光量为 0 属于有效记录，已计入统计；但参与互动率计算时会导致该条互动率不可计算。',
      });
    }
    if (cf.issues.engagementsWithoutImpressionsCount > 0) {
      add({
        severity: 'warning',
        code: 'eng-without-imp',
        title: `${cf.issues.engagementsWithoutImpressionsCount} 条帖子存在互动但曝光缺失或为 0`,
        detail: '这类记录无法计算互动率，且可能暗示导入不完整或字段映射有误。建议核对曝光列映射。',
      });
    }
  }

  // —— Overview 文件 ——
  if (of) {
    const m = dataset.mapping.overview;
    if (!m.date) add({ severity: 'warning', code: 'overview-no-date', title: 'Overview 数据缺少日期字段', detail: '每日汇总数据必须有日期列，否则整份文件无法使用。请在字段映射中指定日期列。' });
    if (!m.follows && !m.unfollows) add({ severity: 'info', code: 'overview-no-follow', title: 'Overview 数据缺少关注/取消关注字段', detail: '无法计算净增粉丝；如文件中有相关列，请在字段映射中指定。' });
    if (of.issues.negativeCount > 0) {
      add({ severity: 'warning', code: 'overview-negative', title: `Overview 数据存在 ${of.issues.negativeCount} 处负数`, detail: '每日汇总中如出现负数（如取消关注），请确认其字段映射正确。' });
    }
    if (of.duplicateCount > 0) add({ severity: 'info', code: 'overview-duplicates', title: `Overview 数据有 ${of.duplicateCount} 个重复日期`, detail: '已保留每个日期第一条记录。' });

    // 日期连续性（Overview 每日数据应有连续日期）
    const dates = dataset.overview.map((o) => o.date).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length >= 2) {
      const gapDays: string[] = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86400000) - 1;
        if (gap > 0) {
          for (let g = 1; g <= gap && gapDays.length < 5; g++) {
            gapDays.push(fmtDate(new Date(dates[i - 1].getTime() + g * 86400000)));
          }
        }
      }
      if (gapDays.length > 0) {
        add({
          severity: 'info',
          code: 'overview-gaps',
          title: 'Overview 每日数据存在日期缺口',
          detail: `覆盖范围内缺失日期示例：${gapDays.join('、')}。缺失日期的指标不会被补零，图表中相应位置将断开。`,
        });
      }
    }
  }

  // —— 两份文件一致性 ——
  if (cf && of && cf.dateMin && cf.dateMax && of.dateMin && of.dateMax) {
    const cStart = parseDateCell(cf.dateMin)!;
    const cEnd = parseDateCell(cf.dateMax)!;
    const oStart = parseDateCell(of.dateMin)!;
    const oEnd = parseDateCell(of.dateMax)!;
    const overlap = cStart <= oEnd && oStart <= cEnd;
    if (!overlap) {
      add({
        severity: 'warning',
        code: 'range-mismatch',
        title: '两份文件的日期范围完全不重叠',
        detail: `Content：${cf.dateMin} ~ ${cf.dateMax}；Overview：${of.dateMin} ~ ${of.dateMax}。无法在同一时间轴上对照分析，请检查导出时选择的日期范围是否一致。`,
      });
    } else {
      const startGap = Math.abs(cStart.getTime() - oStart.getTime()) / 86400000;
      const endGap = Math.abs(cEnd.getTime() - oEnd.getTime()) / 86400000;
      if (startGap > 7 || endGap > 7) {
        add({
          severity: 'info',
          code: 'range-partial-mismatch',
          title: '两份文件的日期范围存在明显差异',
          detail: `Content：${cf.dateMin} ~ ${cf.dateMax}；Overview：${of.dateMin} ~ ${of.dateMax}。建议导出时使用相同的日期范围，否则对比结果可能不一致。`,
        });
      }
    }
  }

  // —— 样本量与覆盖 ——
  const contentCount = dataset.content.length;
  if (contentCount < THRESHOLDS.minSamplePerPeriod) {
    add({
      severity: 'warning',
      code: 'too-few-posts',
      title: `内容数据仅 ${contentCount} 条，样本不足`,
      detail: `周期对比要求每个周期至少 ${THRESHOLDS.minSamplePerPeriod} 条帖子（建议 ${THRESHOLDS.preferredSamplePerPeriod} 条）。样本不足时，系统只会展示原始数据，不会给出确定性结论。`,
    });
  } else if (contentCount < THRESHOLDS.preferredSamplePerPeriod) {
    add({
      severity: 'info',
      code: 'sample-below-preferred',
      title: `内容数据 ${contentCount} 条，可进行基础对比`,
      detail: `已满足最低样本（${THRESHOLDS.minSamplePerPeriod} 条），但未达到建议样本（${THRESHOLDS.preferredSamplePerPeriod} 条），对比结论请谨慎参考。`,
    });
  }

  const allDates = [
    ...dataset.content.map((p) => p.date),
    ...dataset.overview.map((o) => o.date),
  ].filter((d): d is Date => d !== null);
  if (allDates.length > 0) {
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const span = Math.round((max.getTime() - min.getTime()) / 86400000) + 1;
    if (span < THRESHOLDS.minRangeDays) {
      add({
        severity: 'warning',
        code: 'short-coverage',
        title: `数据覆盖仅 ${span} 天`,
        detail: `少于 ${THRESHOLDS.minRangeDays} 天，无法形成有意义的趋势对比。建议导出更长周期的数据后重新导入。`,
      });
    }
    if (span < 14) {
      add({ severity: 'info', code: 'short-coverage-14', title: '数据覆盖少于 14 天', detail: '趋势与周期结论的稳定性有限，请结合更多历史数据复核。' });
    }
  }

  return findings;
}

/** 有效帖子（有日期且日期可解析）数量。 */
export function validPostCount(dataset: Dataset): number {
  return count(dataset.content.map((p) => (p.date ? 1 : null)));
}

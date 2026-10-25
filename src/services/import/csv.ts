/** CSV 文件读取与解析（PapaParse 封装），处理 BOM、编码异常与常见分隔符。 */

import Papa from 'papaparse';
import type { ParseResult } from '../../types';

/**
 * 读取 File 为文本。优先 UTF-8（严格模式），失败则尝试 GBK。
 * 返回 { text, encoding }。
 */
export async function readFileText(file: File): Promise<{ text: string; encoding: 'utf-8' | 'gbk' }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // 剥离 UTF-8 BOM
  let offset = 0;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) offset = 3;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf.slice(offset));
    return { text, encoding: 'utf-8' };
  } catch {
    try {
      const text = new TextDecoder('gbk').decode(buf.slice(offset));
      return { text, encoding: 'gbk' };
    } catch {
      // 兜底：宽松 UTF-8
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(offset));
      return { text, encoding: 'utf-8' };
    }
  }
}

/**
 * 解析 CSV 文本为表头 + 行对象。动态类型关闭，全部保留为字符串，交由后续识别层处理。
 * 返回的行数 = 数据行数（不含表头）。
 */
export function parseCsvText(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const errors = (result.errors ?? []).map((e) => ({ row: (e.row ?? 0) + 1, message: e.message }));

  // 清理空表头、处理重复列名（PapaParse 会为重复列名追加后缀或覆盖，这里保留原样并标记）
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const h of (result.meta.fields ?? [])) {
    const key = h ?? '';
    if (key === '') continue;
    if (seen.has(key)) headers.push(`${key} (重复)`);
    else headers.push(key);
    seen.add(key);
  }

  const rows = (result.data ?? []).filter((r) => r && Object.keys(r).length > 0);

  return { headers, rows, rowCount: rows.length, errors };
}

/** 将文件解析为 CSV 结构。 */
export async function parseCsvFile(file: File): Promise<{ parse: ParseResult; encoding: 'utf-8' | 'gbk' }> {
  const { text, encoding } = await readFileText(file);
  const parse = parseCsvText(text);
  if (parse.errors.length > 0 && parse.rows.length === 0) {
    throw new Error('CSV 解析失败：无法识别文件结构，请确认文件为有效的 CSV 格式。');
  }
  return { parse, encoding };
}

/** 空值判断 */
export function isEmptyCell(v: string | undefined | null): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

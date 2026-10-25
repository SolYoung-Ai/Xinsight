/** 全局应用状态：导入、字段映射、范围、主题、持久化与提示。 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Dataset,
  FieldMapping,
  FileKind,
  ImportFileInfo,
  ParseResult,
  RangePreset,
} from '../types';
import { autoMap, detectFileKind } from '../services/import/fields';
import { parseCsvFile, parseCsvText } from '../services/import/csv';
import { buildFileInfo, transformContent, transformOverview } from '../services/import/transform';
import { generateDemoContentCsv, generateDemoOverviewCsv } from '../services/demo';
import { presetRange, resolveRange, type EffectiveRange } from '../services/analytics/range';
import { clearPersisted, loadPersisted, savePersisted } from '../services/storage';

export interface StoredFile {
  kind: FileKind;
  fileName: string;
  parse: ParseResult;
  isDemo: boolean;
  importedAt: string;
}

export interface PendingImport {
  fileName: string;
  parse: ParseResult;
  autoMapping: FieldMapping;
  detectedKind: FileKind;
  isDemo: boolean;
}

interface DataContextValue {
  dataset: Dataset | null;
  files: { content?: StoredFile; overview?: StoredFile };
  pending: PendingImport | null;
  beginImport: (file: File) => Promise<void>;
  beginDemoImport: () => void;
  commitImport: (kind: FileKind, mapping: FieldMapping) => void;
  cancelImport: () => void;
  applyMapping: (kind: FileKind, mapping: FieldMapping) => void;
  removeFile: (kind: FileKind) => void;
  clearAll: () => void;
  importInfo: (kind: FileKind) => ImportFileInfo | null;

  rangePreset: RangePreset;
  setRangePreset: (r: RangePreset) => void;
  customRange: { start: string; end: string };
  setCustomRange: (c: { start: string; end: string }) => void;
  range: EffectiveRange | null;
  resetRangeToPreset: () => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  persist: boolean;
  setPersist: (b: boolean) => void;

  toast: string | null;
  notify: (msg: string) => void;
  ready: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const THEME_KEY = 'x-account-insight:theme';

function buildDataset(files: { content?: StoredFile; overview?: StoredFile }, mappings: { content: FieldMapping; overview: FieldMapping }): Dataset | null {
  if (!files.content && !files.overview) return null;
  const contentOut = files.content ? transformContent(files.content.parse, mappings.content) : null;
  const overviewOut = files.overview ? transformOverview(files.overview.parse, mappings.overview) : null;
  return {
    content: contentOut?.records ?? [],
    overview: overviewOut?.records ?? [],
    contentFile: files.content && contentOut ? buildFileInfo('content', files.content.fileName, files.content.parse, contentOut, files.content.isDemo) : null,
    overviewFile: files.overview && overviewOut ? buildFileInfo('overview', files.overview.fileName, files.overview.parse, overviewOut, files.overview.isDemo) : null,
    mapping: mappings,
    importedAt: new Date().toISOString(),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<{ content?: StoredFile; overview?: StoredFile }>({});
  const [mappings, setMappings] = useState<{ content: FieldMapping; overview: FieldMapping }>({ content: {}, overview: {} });
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [persist, setPersist] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  // 恢复上次保存（仅在用户此前主动启用过保存时）
  useEffect(() => {
    const p = loadPersisted();
    if (p && p.enabled && p.dataset) {
      setDataset(p.dataset);
      setPersist(true);
      // 恢复后立即触发一次 toast（延迟到渲染后）
      window.setTimeout(() => notify('已恢复浏览器中保存的上次数据（可随时清除）'), 400);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 主题应用到文档
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // 持久化
  useEffect(() => {
    if (!ready) return;
    if (persist && dataset) {
      const ok = savePersisted(dataset);
      if (!ok) {
        setPersist(false);
        notify('浏览器本地保存失败（存储空间不足或已被禁用），数据仅在本次会话内存中');
      }
    } else if (!persist) {
      clearPersisted();
    }
  }, [persist, dataset, ready, notify]);

  const commitDataset = useCallback((nextFiles: typeof files, nextMappings: typeof mappings) => {
    setFiles(nextFiles);
    setMappings(nextMappings);
    const d = buildDataset(nextFiles, nextMappings);
    setDataset(d);
  }, []);

  const beginImport = useCallback(async (file: File) => {
    const { parse, encoding } = await parseCsvFile(file);
    const autoMapping = autoMap(parse.headers);
    const detectedKind = detectFileKind(parse.headers, autoMapping);
    setPending({
      fileName: file.name,
      parse,
      autoMapping,
      detectedKind,
      isDemo: false,
    });
    if (encoding === 'gbk') {
      window.setTimeout(() => notify('文件按 GBK 编码读取成功（表头如显示异常可调整字段映射）'), 300);
    }
  }, [notify]);

  const beginDemoImport = useCallback(() => {
    const contentParse = parseCsvText(generateDemoContentCsv());
    const overviewParse = parseCsvText(generateDemoOverviewCsv());
    const m1 = autoMap(contentParse.headers);
    const m2 = autoMap(overviewParse.headers);
    const filesNext = {
      content: {
        kind: 'content' as const,
        fileName: 'demo-content.csv（模拟数据）',
        parse: contentParse,
        isDemo: true,
        importedAt: new Date().toISOString(),
      },
      overview: {
        kind: 'overview' as const,
        fileName: 'demo-overview.csv（模拟数据）',
        parse: overviewParse,
        isDemo: true,
        importedAt: new Date().toISOString(),
      },
    };
    commitDataset(filesNext, { content: m1, overview: m2 });
    notify('已加载模拟演示数据（明确标注为模拟数据，与真实数据隔离）');
  }, [commitDataset, notify]);

  const commitImport = useCallback(
    (kind: FileKind, mapping: FieldMapping) => {
      if (!pending) return;
      const file: StoredFile = {
        kind,
        fileName: pending.fileName,
        parse: pending.parse,
        isDemo: pending.isDemo,
        importedAt: new Date().toISOString(),
      };
      const nextFiles = { ...files, [kind]: file };
      const nextMappings = { ...mappings, [kind]: mapping };
      setPending(null);
      commitDataset(nextFiles, nextMappings);
      const count = kind === 'content' ? transformContent(file.parse, mapping).parsedCount : transformOverview(file.parse, mapping).parsedCount;
      notify(`${kind === 'content' ? 'Content' : 'Overview'} 导入成功：${count} 条记录`);
    },
    [pending, files, mappings, commitDataset, notify],
  );

  const cancelImport = useCallback(() => setPending(null), []);

  const applyMapping = useCallback(
    (kind: FileKind, mapping: FieldMapping) => {
      const nextMappings = { ...mappings, [kind]: mapping };
      setMappings(nextMappings);
      const d = buildDataset(files, nextMappings);
      setDataset(d);
      notify('字段映射已更新，数据已重新计算');
    },
    [files, mappings, notify],
  );

  const removeFile = useCallback(
    (kind: FileKind) => {
      const nextFiles = { ...files };
      delete nextFiles[kind];
      const nextMappings = { ...mappings, [kind]: {} };
      commitDataset(nextFiles, nextMappings);
      notify(`${kind === 'content' ? 'Content' : 'Overview'} 文件已移除`);
    },
    [files, mappings, commitDataset, notify],
  );

  const clearAll = useCallback(() => {
    setFiles({});
    setMappings({ content: {}, overview: {} });
    setDataset(null);
    setPending(null);
    setCustomRange({ start: '', end: '' });
    setRangePreset('30d');
    clearPersisted();
    setPersist(false);
    notify('已清除所有数据（内存、图表缓存与本地保存均已清理）');
  }, [notify]);

  const importInfo = useCallback(
    (kind: FileKind): ImportFileInfo | null => (kind === 'content' ? dataset?.contentFile ?? null : dataset?.overviewFile ?? null),
    [dataset],
  );

  const range = useMemo<EffectiveRange | null>(() => {
    if (!dataset) return null;
    let start: Date;
    let end: Date;
    if (rangePreset === 'custom' && customRange.start && customRange.end) {
      start = new Date(`${customRange.start}T00:00:00`);
      end = new Date(`${customRange.end}T00:00:00`);
    } else {
      const days = rangePreset === '7d' ? 7 : rangePreset === '30d' ? 30 : 90;
      const p = presetRange(dataset, days);
      start = p.start;
      end = p.end;
    }
    return resolveRange(dataset, start, end);
  }, [dataset, rangePreset, customRange]);

  const resetRangeToPreset = useCallback(() => {
    setRangePreset('30d');
    setCustomRange({ start: '', end: '' });
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  const value: DataContextValue = {
    dataset, files, pending,
    beginImport, beginDemoImport, commitImport, cancelImport, applyMapping, removeFile, clearAll, importInfo,
    rangePreset, setRangePreset, customRange, setCustomRange, range, resetRangeToPreset,
    theme, toggleTheme, persist, setPersist,
    toast, notify, ready,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData 必须在 DataProvider 内使用');
  return ctx;
}

import { useMemo, useState } from 'react';
import { Check, Wand2 } from 'lucide-react';
import type { FieldMapping, FileKind } from '../types';
import type { PendingImport } from '../state/DataContext';
import { FIELD_LABELS, type FieldKey } from '../services/import/fields';
import { Button } from './ui/Button';
import { Notice } from './ui/Notice';
import uiStyles from '../styles/ui.module.css';
import mapStyles from './Mapping.module.css';

const CONTENT_FIELDS: FieldKey[] = [
  'postId', 'postUrl', 'postText', 'date', 'impressions', 'likes', 'replies', 'reposts',
  'quotes', 'bookmarks', 'profileVisits', 'follows', 'engagements', 'engagementRate', 'urlClicks',
];
const OVERVIEW_FIELDS: FieldKey[] = [
  'date', 'impressions', 'likes', 'replies', 'reposts', 'quotes', 'profileVisits', 'follows', 'unfollows', 'mentions',
];

export function FieldMappingEditor({
  pending,
  onCommit,
  onCancel,
}: {
  pending: PendingImport;
  onCommit: (kind: FileKind, mapping: FieldMapping) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<FileKind>(pending.detectedKind);
  const [mapping, setMapping] = useState<FieldMapping>({ ...pending.autoMapping });

  const fields = kind === 'content' ? CONTENT_FIELDS : OVERVIEW_FIELDS;
  const mappedCount = useMemo(() => fields.filter((f) => mapping[f]).length, [fields, mapping]);
  const autoCount = useMemo(() => fields.filter((f) => pending.autoMapping[f] && mapping[f] === pending.autoMapping[f]).length, [fields, mapping, pending.autoMapping]);

  const headers = pending.parse.headers;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Notice tone="info">
        已识别文件：<strong>{pending.fileName}</strong>（{pending.parse.rowCount} 行）。已自动识别{' '}
        {Object.values(pending.autoMapping).filter(Boolean).length} 个字段，请确认下方映射；识别不准的字段可手动调整，
        无需重新上传文件。
      </Notice>

      <div className={uiStyles.field}>
        <div className={uiStyles.fieldLabel}>文件类型</div>
        <select
          className={uiStyles.select}
          value={kind}
          onChange={(e) => {
            const k = e.target.value as FileKind;
            setKind(k);
            setMapping({ ...pending.autoMapping });
          }}
        >
          <option value="content">Content CSV — 单条帖子表现数据</option>
          <option value="overview">Overview CSV — 账号每日整体表现数据</option>
        </select>
        <div className={uiStyles.fieldHint}>系统已根据表头自动判断，如判断错误可手动切换；切换后映射将按新类型重新识别。</div>
      </div>

      <div>
        <div className={uiStyles.fieldLabel} style={{ marginBottom: 8 }}>
          字段映射
          <span className="muted small" style={{ fontWeight: 400, marginLeft: 8 }}>
            {mappedCount}/{fields.length} 已映射 · 自动匹配 {autoCount} 项
          </span>
        </div>
        <div className={mapStyles.mappingGrid}>
          {fields.map((key) => {
            const value = mapping[key];
            const isAuto = pending.autoMapping[key] === value && value !== undefined;
            return (
              <div key={key} className={mapStyles.mappingRow}>
                <div className={mapStyles.mappingLabel}>
                  {FIELD_LABELS[key]}
                  {isAuto ? <Wand2 size={12} style={{ color: 'var(--accent-text)' }} aria-label="自动识别" /> : null}
                </div>
                <select
                  className={uiStyles.select}
                  value={value ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}
                >
                  <option value="">（未映射 — 该指标不可用）</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className={uiStyles.fieldLabel} style={{ marginBottom: 8 }}>
          数据预览（前 {Math.min(3, pending.parse.rows.length)} 行）
        </div>
        {pending.parse.rows.length === 0 ? (
          <Notice tone="warning">文件中没有可解析的数据行。</Notice>
        ) : (
          <div className={uiStyles.tableWrap} style={{ overflowX: 'auto' }}>
            <table className={uiStyles.table}>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.parse.rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h} className="small">
                        {String(row[h] ?? '').slice(0, 60) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pending.parse.errors.length > 0 ? (
          <Notice tone="warning" style={{ marginTop: 10 }}>
            CSV 解析有 {pending.parse.errors.length} 条提示（如引号未闭合等）：{pending.parse.errors[0].message}
          </Notice>
        ) : null}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button variant="primary" onClick={() => onCommit(kind, mapping)}>
          <Check size={15} />
          应用映射并导入
        </Button>
      </div>
    </div>
  );
}

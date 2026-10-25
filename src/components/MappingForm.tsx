import { useMemo } from 'react';
import { Wand2 } from 'lucide-react';
import type { FieldMapping, FileKind } from '../types';
import { FIELD_LABELS, type FieldKey } from '../services/import/fields';
import uiStyles from '../styles/ui.module.css';
import mapStyles from './Mapping.module.css';

const CONTENT_FIELDS: FieldKey[] = [
  'postId', 'postUrl', 'postText', 'date', 'impressions', 'likes', 'replies', 'reposts',
  'quotes', 'bookmarks', 'profileVisits', 'follows', 'engagements', 'engagementRate', 'urlClicks',
];
const OVERVIEW_FIELDS: FieldKey[] = [
  'date', 'impressions', 'likes', 'replies', 'reposts', 'quotes', 'profileVisits', 'follows', 'unfollows', 'mentions',
];

export function MappingForm({
  kind,
  mapping,
  headers,
  onChange,
  autoMapping,
}: {
  kind: FileKind;
  mapping: FieldMapping;
  headers: string[];
  onChange: (m: FieldMapping) => void;
  autoMapping?: FieldMapping;
}) {
  const fields = kind === 'content' ? CONTENT_FIELDS : OVERVIEW_FIELDS;
  const mappedCount = useMemo(() => fields.filter((f) => mapping[f]).length, [fields, mapping]);

  return (
    <div>
      <div className={uiStyles.fieldLabel} style={{ marginBottom: 8 }}>
        字段映射
        <span className="muted small" style={{ fontWeight: 400, marginLeft: 8 }}>
          {mappedCount}/{fields.length} 已映射
        </span>
      </div>
      <div className={mapStyles.mappingGrid}>
        {fields.map((key) => {
          const value = mapping[key];
          const isAuto = autoMapping && autoMapping[key] === value && value !== undefined;
          return (
            <div key={key} className={mapStyles.mappingRow}>
              <div className={mapStyles.mappingLabel}>
                {FIELD_LABELS[key]}
                {isAuto ? <Wand2 size={12} style={{ color: 'var(--accent-text)' }} aria-label="自动识别" /> : null}
              </div>
              <select
                className={uiStyles.select}
                value={value ?? ''}
                onChange={(e) => onChange({ ...mapping, [key]: e.target.value || undefined })}
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
  );
}

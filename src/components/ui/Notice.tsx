import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import styles from '../../styles/ui.module.css';

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'muted';

const ICONS: Record<Tone, ReactNode> = {
  info: <Info size={16} className={styles.noticeIcon} />,
  warning: <TriangleAlert size={16} className={styles.noticeIcon} />,
  danger: <AlertCircle size={16} className={styles.noticeIcon} />,
  success: <CheckCircle2 size={16} className={styles.noticeIcon} />,
  muted: <Info size={16} className={styles.noticeIcon} />,
};

const TONES: Record<Tone, string> = {
  info: styles.noticeInfo,
  warning: styles.noticeWarning,
  danger: styles.noticeDanger,
  success: styles.noticeSuccess,
  muted: styles.noticeMuted,
};

export function Notice({ tone = 'info', children, style }: { tone?: Tone; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={[styles.notice, TONES[tone]].join(' ')} style={style}>
      {ICONS[tone]}
      <div>{children}</div>
    </div>
  );
}

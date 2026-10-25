import type { ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

type Tone = 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const TONE_MAP: Record<Tone, string> = {
  muted: styles.badgeMuted,
  accent: styles.badgeAccent,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  outline: styles.badgeOutline,
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={[styles.badge, TONE_MAP[tone]].join(' ')}>{children}</span>;
}

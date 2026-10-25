import type { ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

interface Props {
  label: ReactNode;
  value: ReactNode;
  delta?: { text: string; dir: 'up' | 'down' | 'flat' | 'na' };
  hint?: ReactNode;
  icon?: ReactNode;
  size?: 'md' | 'sm';
}

export function StatCard({ label, value, delta, hint, icon, size = 'md' }: Props) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>
        {icon ? <span className={styles.statIcon}>{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className={size === 'sm' ? styles.statValueSm : styles.statValue}>{value}</div>
      {delta ? (
        <div
          className={[
            styles.statDelta,
            delta.dir === 'up' ? styles.statDeltaUp : '',
            delta.dir === 'down' ? styles.statDeltaDown : '',
            delta.dir === 'flat' || delta.dir === 'na' ? styles.statDeltaFlat : '',
          ].join(' ')}
        >
          {delta.text}
        </div>
      ) : null}
      {hint ? <div className={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

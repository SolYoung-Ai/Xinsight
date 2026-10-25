import type { ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      {icon ? <div className={styles.emptyIcon}>{icon}</div> : null}
      <div className={styles.emptyTitle}>{title}</div>
      {desc ? <div className={styles.emptyDesc}>{desc}</div> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

export function Loading({ text = '正在计算…' }: { text?: string }) {
  return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <div>{text}</div>
    </div>
  );
}

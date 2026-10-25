import type { ReactNode } from 'react';
import styles from '../styles/ui.module.css';

export function PageHeader({ title, desc, actions }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.toolbar}>
      <div style={{ minWidth: 0 }}>
        <div className={styles.toolbarTitle}>{title}</div>
        {desc ? <div className={styles.toolbarDesc}>{desc}</div> : null}
      </div>
      <div className="spacer" />
      {actions}
    </div>
  );
}

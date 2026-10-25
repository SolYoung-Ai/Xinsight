import type { ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

interface Tab {
  key: string;
  label: string;
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={[styles.tab, active === t.key ? styles.tabActive : ''].join(' ')}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ items, active, onChange }: { items: Tab[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className={styles.segmented}>
      {items.map((t) => (
        <button
          key={t.key}
          className={[styles.segItem, active === t.key ? styles.segActive : ''].join(' ')}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button className={[styles.chip, active ? styles.chipActive : ''].join(' ')} onClick={onClick}>
      {children}
    </button>
  );
}

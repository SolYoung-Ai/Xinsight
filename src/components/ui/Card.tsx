import type { ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

export function Card({ children, className, pad }: { children: ReactNode; className?: string; pad?: boolean }) {
  const cls = [styles.card, pad === false ? '' : styles.cardPad, className ?? ''].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}

export function CardHeader({ title, sub, right, pad }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; pad?: boolean }) {
  return (
    <div className={pad ? styles.cardHeaderPad : styles.cardHeader}>
      <div>
        <div className={styles.cardTitle}>{title}</div>
        {sub ? <div className={styles.cardSub}>{sub}</div> : null}
      </div>
      {right ? <div className="row">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.cardBody, className ?? ''].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardFoot({ children }: { children: ReactNode }) {
  return <div className={styles.cardFoot}>{children}</div>;
}

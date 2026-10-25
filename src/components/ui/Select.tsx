import { type ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: ReactNode }>;
  ariaLabel?: string;
}

export function Select({ value, onChange, options, ariaLabel }: Props) {
  return (
    <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

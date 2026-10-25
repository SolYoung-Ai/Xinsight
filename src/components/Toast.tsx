import { CheckCircle2 } from 'lucide-react';
import { useData } from '../state/DataContext';
import styles from './Toast.module.css';

export function Toast() {
  const { toast } = useData();
  if (!toast) return null;
  return (
    <div className={styles.toast} role="status">
      <CheckCircle2 size={16} style={{ flex: 'none' }} />
      <span>{toast}</span>
    </div>
  );
}

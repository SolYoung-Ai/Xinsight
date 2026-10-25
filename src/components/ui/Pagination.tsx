import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../../styles/ui.module.css';

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  for (let i = start; i <= Math.min(pageCount, start + 4); i++) pages.push(i);

  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页">
        <ChevronLeft size={14} />
      </button>
      {pages[0] > 1 ? <span className="muted small">…</span> : null}
      {pages.map((p) => (
        <button
          key={p}
          className={[styles.pageBtn, p === page ? styles.pageBtnActive : ''].join(' ')}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < pageCount ? <span className="muted small">…</span> : null}
      <button className={styles.pageBtn} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="下一页">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

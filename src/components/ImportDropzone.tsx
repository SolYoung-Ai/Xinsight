import { useRef, useState, type ReactNode } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import styles from './Import.module.css';

interface Props {
  title: string;
  desc: ReactNode;
  onFile: (f: File) => void;
  busy?: boolean;
  accent?: string;
}

export function ImportDropzone({ title, desc, onFile, busy, accent }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (f: File | undefined | null) => {
    if (f) onFile(f);
  };

  return (
    <div
      className={[styles.dropzone, drag ? styles.dropzoneActive : ''].join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className={styles.dropIcon} style={accent ? { color: accent } : undefined}>
        {busy ? <Loader2 size={22} className={styles.spin} /> : <FileUp size={22} />}
      </div>
      <div className={styles.dropTitle}>{title}</div>
      <div className={styles.dropDesc}>{desc}</div>
      <span className={styles.dropBtn}>选择文件</span>
    </div>
  );
}

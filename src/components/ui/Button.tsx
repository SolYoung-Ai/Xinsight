import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from '../../styles/ui.module.css';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'outline', size = 'md', block, className, children, ...rest },
  ref,
) {
  const cls = [
    styles.btn,
    variant === 'primary' ? styles.btnPrimary : '',
    variant === 'outline' ? styles.btnOutline : '',
    variant === 'ghost' ? styles.btnGhost : '',
    variant === 'danger' ? styles.btnDanger : '',
    size === 'sm' ? styles.btnSm : '',
    size === 'lg' ? styles.btnLg : '',
    size === 'icon' ? styles.btnIcon : '',
    block ? styles.btnBlock : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} className={cls} {...rest}>
      {children}
    </button>
  );
});

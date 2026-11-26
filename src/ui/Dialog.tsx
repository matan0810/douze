import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';
import { Icon } from './Icon';
import styles from './Dialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Read by screen readers as the dialog's name. */
  label: string;
  header: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

/**
 * The browser's own modal <dialog>: focus is trapped, Esc closes it and focus returns to
 * the opener, with no code of ours. A click on the backdrop closes it too.
 */
export function Dialog({ open, onClose, label, header, footer, wide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ''}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className={styles.head}>
            <div className={styles.headContent}>{header}</div>
            <button type="button" className={styles.close} aria-label={t.close} onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.foot}>{footer}</div>}
        </>
      )}
    </dialog>
  );
}

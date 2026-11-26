import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ToastContext } from './toastContext';
import styles from './Toast.module.css';

/** How long a message stays: long enough to read two short lines. */
const SHOWN_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; at: number } | null>(null);
  const show = useCallback((text: string) => setMessage({ text, at: Date.now() }), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {message && (
          <div key={message.at} className={styles.toast}>
            {message.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

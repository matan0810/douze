import { useEffect, useRef, useState } from 'react';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { saveSession, takeAfterSignIn } from '../../state/session';
import { PageTitle } from '../../ui/PageTitle';
import { SignInButton } from './SignInButton';
import styles from './Groups.module.css';

/**
 * The page Google's sign-in comes back to: the one-time code in the address becomes a
 * session on this device, the address is replaced at once so the code is not kept in the
 * history, and the person goes on to where they were.
 */
export function SignedScreen({ code }: { code: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(code === 'failed');
  // A code works once: strict mode runs effects twice, and the second would burn it.
  const started = useRef(false);

  useEffect(() => {
    if (code === 'failed' || started.current) return;
    started.current = true;
    history.replaceState(null, '', location.pathname + location.search + '#/signed');
    void api.collectSession(code).then((answer) => {
      if (!answer.ok) return setFailed(true);
      saveSession(answer.value);
      const back = takeAfterSignIn();
      if (back) {
        history.replaceState(null, '', location.pathname + location.search + back);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else navigate({ name: 'groups' });
    });
  }, [code]);

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.groups}
        start={t.signIn.titleStart}
        end={t.signIn.titleEnd}
        lead=""
      />
      {failed ? (
        <div className={styles.actions}>
          <p className="note note-warn" role="alert">
            {t.signIn.failed}
          </p>
          <SignInButton />
        </div>
      ) : (
        <p className={styles.muted}>{t.group.loading}</p>
      )}
    </div>
  );
}

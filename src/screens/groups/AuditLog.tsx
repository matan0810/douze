import { useState } from 'react';
import type { AuditEntry } from '../../../shared/groups';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { useToast } from '../../ui/toastContext';
import styles from './Groups.module.css';

/** The group's log, for its managers: who did what, and when. */
export function AuditLog({ group, token }: { group: string; token: string }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const when = new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <section className={styles.section} aria-labelledby="audit">
      <h2 id="audit" className="section-label">
        {t.group.audit}
      </h2>
      {entries === null ? (
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-line"
            onClick={async () => {
              const answer = await api.audit(group, token);
              if (answer.ok) setEntries(answer.value);
              else toast(t.errors[answer.error]);
            }}
          >
            {t.group.auditShow}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className={styles.muted}>{t.group.auditEmpty}</p>
      ) : (
        <ul className={styles.log}>
          {entries.map((e, i) => (
            <li key={`${e.at}-${i}`}>
              <span className={styles.muted}>{when.format(e.at)}</span> {e.actor ?? ''}{' '}
              {t.group.action[e.action]}{' '}
              {e.action === 'member.release' || e.action === 'role.change' ? e.subject : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

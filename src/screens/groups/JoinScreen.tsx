import { useEffect, useState, type FormEvent } from 'react';
import { parseName, type Preview } from '../../../shared/groups';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { api, type Failure } from '../../net/api';
import { remember } from '../../state/memberships';
import { PageTitle } from '../../ui/PageTitle';
import styles from './Groups.module.css';

/**
 * Joining from an invitation link: the group and who is in it, then a new name, or one's own
 * name from another phone. Once in, the secret leaves the address bar and the history.
 */
export function JoinScreen({ id, secret }: { id: string; secret: string }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void api.preview(id, secret).then((answer) => {
      if (!live) return;
      if (answer.ok) setPreview(answer.value);
      else setFailed(answer.error);
    });
    return () => {
      live = false;
    };
  }, [id, secret]);

  const join = async (wanted: string, takeover: boolean) => {
    setBusy(true);
    const answer = await api.join(id, secret, wanted, takeover);
    setBusy(false);
    if (!answer.ok) return setFailed(answer.error);
    const { group, token } = answer.value;
    remember({
      group: group.id,
      token,
      invite: secret,
      groupName: group.name,
      myName: group.me.name,
    });
    // The group's page, in place of the invitation: the secret is not kept in the history.
    window.history.replaceState(null, '', routeHash({ name: 'group', id: group.id }));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const wanted = parseName(name);
    if (wanted) void join(wanted, false);
  };

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.join}
        start={t.join.titleStart}
        end={t.join.titleEnd}
        lead={preview ? t.join.lead(preview.name) : ''}
      />
      {failed && (
        <p className="note note-warn" role="alert">
          {failed === 'invite-wrong' ? t.join.invalid : t.errors[failed]}
        </p>
      )}
      {preview && (
        <div className={styles.stack}>
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              <span>{t.join.name}</span>
              <input
                className="input"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!parseName(name) || busy}>
              {t.join.button}
            </button>
          </form>
          {preview.members.length > 0 && (
            <section className={styles.section}>
              <p className={styles.muted}>{t.join.already}</p>
              <div className={styles.chips}>
                {preview.members.map((m) =>
                  m.role === 'member' ? (
                    <button
                      key={m.name}
                      type="button"
                      className="btn btn-line"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.join.takeoverConfirm(m.name))) void join(m.name, true);
                      }}
                    >
                      {t.join.itsMe(m.name)}
                    </button>
                  ) : (
                    <span key={m.name} className={styles.card} title={t.join.manager}>
                      {m.name} · {t.group.role[m.role]}
                    </span>
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import type { MyGroup } from '../../../shared/accounts';
import { parseName } from '../../../shared/groups';
import { routeHash } from '../../domain/routes';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { rememberInvite } from '../../state/invites';
import { clearSession, useSession } from '../../state/session';
import { SignInButton } from './SignInButton';
import { Icon } from '../../ui/Icon';
import { PageTitle } from '../../ui/PageTitle';
import styles from './Groups.module.css';

/** The groups this device is in, and a way to open a new one. */
export function GroupsScreen() {
  const { t } = useI18n();
  const session = useSession();
  const [mine, setMine] = useState<MyGroup[] | null>(null);

  useEffect(() => {
    if (!session) return;
    let live = true;
    void api.me().then((answer) => {
      if (!live) return;
      // A session the server no longer knows (ended elsewhere, or expired) is dropped.
      if (!answer.ok && answer.error === 'unauthorized') clearSession();
      setMine(answer.ok ? answer.value.groups : []);
    });
    return () => {
      live = false;
    };
  }, [session]);

  const signOut = async () => {
    await api.signOut();
    clearSession();
    setMine(null);
  };
  const [group, setGroup] = useState('');
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = !!parseName(group) && !!parseName(me);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const groupName = parseName(group);
    const myName = parseName(me);
    if (!groupName || !myName) return;
    setBusy(true);
    const made = await api.createGroup(groupName, myName);
    setBusy(false);
    if (!made.ok) return setError(t.errors[made.error]);
    const { group: view, invite } = made.value;
    if (invite) rememberInvite(view.id, invite);
    navigate({ name: 'group', id: view.id });
  };

  if (!session)
    return (
      <div className={styles.page}>
        <PageTitle
          eyebrow={t.eyebrow.groups}
          start={t.groups.titleStart}
          end={t.groups.titleEnd}
          lead={t.groups.lead}
        />
        <div className={styles.actions}>
          <p className={styles.muted}>{t.signIn.why}</p>
          <SignInButton />
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.groups}
        start={t.groups.titleStart}
        end={t.groups.titleEnd}
        lead={t.groups.lead}
      />
      <div className={styles.stack}>
        <section className={styles.section} aria-labelledby="mine">
          <h2 id="mine" className="section-label">
            {t.groups.mine}
          </h2>
          {mine === null ? (
            <p className={styles.muted}>{t.group.loading}</p>
          ) : mine.length === 0 ? (
            <p className="empty frame">{t.groups.none}</p>
          ) : (
            <ul className={styles.list}>
              {mine.map((m) => (
                <li key={m.id}>
                  <a className={styles.card} href={routeHash({ name: 'group', id: m.id })}>
                    <Icon name="players" size={18} />
                    <span className={styles.name}>{m.name}</span>
                    <span className={styles.muted}>{t.groups.as(m.me.name)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form className={styles.form} onSubmit={create} aria-labelledby="create">
          <h2 id="create" className="section-label">
            {t.groups.create}
          </h2>
          <label className={styles.field}>
            <span>{t.groups.groupName}</span>
            <input
              className="input"
              value={group}
              maxLength={40}
              onChange={(e) => setGroup(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t.groups.myName}</span>
            <input
              className="input"
              value={me}
              maxLength={40}
              onChange={(e) => setMe(e.target.value)}
            />
          </label>
          {error && (
            <p className="note note-warn" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
            <Icon name="plus" size={16} />
            {t.groups.createButton}
          </button>
        </form>

        <div className={styles.danger}>
          <span className={styles.muted}>{t.signIn.as(session.name)}</span>
          <button type="button" className="btn btn-quiet" onClick={() => void signOut()}>
            {t.signIn.out}
          </button>
        </div>
      </div>
    </div>
  );
}

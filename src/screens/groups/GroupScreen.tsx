import { can } from '../../../shared/capabilities';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { forget } from '../../state/memberships';
import { PageTitle } from '../../ui/PageTitle';
import { useToast } from '../../ui/toastContext';
import { AuditLog } from './AuditLog';
import { InviteBox } from './InviteBox';
import { MemberList } from './MemberList';
import { useGroupView } from './useGroupView';
import { YearsSection } from './YearsSection';
import styles from './Groups.module.css';

/** One group: who is in it, the invitation, and what the viewer's role allows. */
export function GroupScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { state, reload, show } = useGroupView(id);

  if (state.kind !== 'ready')
    return (
      <div className={styles.page}>
        <PageTitle eyebrow={t.eyebrow.group} start={t.nav.groups} end="" lead="" />
        {state.kind === 'loading' && <p className={styles.muted}>{t.group.loading}</p>}
        {state.kind === 'failed' && (
          <div className={styles.actions}>
            <p className="note note-warn" role="alert">
              {t.errors[state.error]}
            </p>
            <button type="button" className="btn btn-line" onClick={() => void reload()}>
              {t.group.retry}
            </button>
          </div>
        )}
        {state.kind === 'out' && (
          <div className={styles.actions}>
            <p className="note note-warn">{t.group.signedOut}</p>
            <button
              type="button"
              className="btn btn-line"
              onClick={() => {
                forget(id);
                navigate({ name: 'groups' });
              }}
            >
              {t.group.forget}
            </button>
          </div>
        )}
      </div>
    );

  const { view, me } = state;
  const leave = async () => {
    if (!window.confirm(t.group.leaveConfirm)) return;
    const answer = await api.leave(id, me.token);
    if (!answer.ok) return toast(t.errors[answer.error]);
    forget(id);
    navigate({ name: 'groups' });
  };
  const remove = async () => {
    const typed = window.prompt(t.group.removePrompt(view.name));
    if (typed === null) return;
    const answer = await api.deleteGroup(id, me.token, typed);
    if (!answer.ok) return toast(t.errors[answer.error]);
    forget(id);
    navigate({ name: 'groups' });
  };

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.group}
        start={view.name}
        end=""
        lead={t.groups.as(view.me.name)}
      />
      <div className={styles.stack}>
        <YearsSection view={view} token={me.token} />
        <MemberList view={view} token={me.token} onChange={show} />
        <InviteBox view={view} me={me} onRenewed={() => void reload()} />
        {can(view.me.role, 'audit.read') && <AuditLog group={id} token={me.token} />}
        <div className={styles.danger}>
          {view.me.role !== 'owner' && (
            <button type="button" className="btn btn-quiet" onClick={leave}>
              {t.group.leave}
            </button>
          )}
          {can(view.me.role, 'group.delete') && (
            <button type="button" className="btn btn-quiet" onClick={remove}>
              {t.group.remove}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

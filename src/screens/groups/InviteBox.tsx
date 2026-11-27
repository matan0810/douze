import { can } from '../../../shared/capabilities';
import type { GroupView } from '../../../shared/groups';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { remember, type Membership } from '../../state/memberships';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toastContext';
import styles from './Groups.module.css';

/** The invitation: the link to pass on, and for the owner, a new one in its place. */
export function InviteBox({
  view,
  me,
  onRenewed,
}: {
  view: GroupView;
  me: Membership;
  onRenewed: (me: Membership) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const link = me.invite
    ? `${location.origin}${import.meta.env.BASE_URL}${routeHash({ name: 'join', id: view.id, secret: me.invite })}`
    : null;

  const renew = async () => {
    if (!window.confirm(t.group.renewConfirm)) return;
    const answer = await api.renewInvite(view.id, me.token);
    if (!answer.ok) return toast(t.errors[answer.error]);
    const next = { ...me, invite: answer.value };
    remember(next);
    onRenewed(next);
  };

  return (
    <section className={styles.section} aria-labelledby="invite">
      <h2 id="invite" className="section-label">
        {t.group.invite}
      </h2>
      <p className={styles.muted}>{link ? t.group.inviteHint : t.group.noInvite}</p>
      {link && (
        <>
          <p className={styles.link} dir="ltr">
            {link}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigator.clipboard.writeText(link).then(
                  () => toast(t.group.copied),
                  () => undefined,
                )
              }
            >
              {t.group.copy}
            </button>
            {'share' in navigator && (
              <button
                type="button"
                className="btn btn-line"
                onClick={() =>
                  navigator
                    .share({ text: t.group.shareText(view.name), url: link })
                    .catch(() => undefined)
                }
              >
                {t.group.share}
              </button>
            )}
          </div>
        </>
      )}
      {can(view.me.role, 'invite.rotate') && (
        <div className={styles.actions}>
          <button type="button" className="btn btn-quiet" onClick={renew}>
            <Icon name="live" size={15} />
            {t.group.renew}
          </button>
        </div>
      )}
    </section>
  );
}

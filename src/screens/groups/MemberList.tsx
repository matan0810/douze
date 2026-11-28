import { can } from '../../../shared/capabilities';
import type { GroupView, Member } from '../../../shared/groups';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { useToast } from '../../ui/toastContext';
import styles from './Groups.module.css';

/**
 * Who is in the group, with their role, and what the viewer may do to each: the buttons
 * follow the same table the server checks (`shared/capabilities.ts`).
 */
export function MemberList({
  view,
  onChange,
}: {
  view: GroupView;
  onChange: (view: GroupView) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const mine = view.me.role;

  const act = async (run: () => ReturnType<typeof api.release>) => {
    const answer = await run();
    if (answer.ok) onChange(answer.value);
    else toast(t.errors[answer.error]);
  };

  const mayRelease = (m: Member) =>
    m.id !== view.me.id &&
    can(mine, 'member.release') &&
    (m.role === 'member' || (m.role === 'admin' && mine === 'owner'));

  return (
    <section className={styles.section} aria-labelledby="members">
      <h2 id="members" className="section-label">
        {t.group.members}
      </h2>
      <ul className={styles.list}>
        {view.members.map((m) => (
          <li key={m.id} className={styles.card}>
            <span className={styles.name}>{m.name}</span>
            {m.id === view.me.id && <span className={styles.muted}>{t.group.me}</span>}
            <span className={`${styles.badge} ${m.role === 'owner' ? styles.owner : ''}`}>
              {t.group.role[m.role]}
            </span>
            <span className={styles.actions}>
              {can(mine, 'admin.manage') && m.role !== 'owner' && (
                <button
                  type="button"
                  className="btn btn-line"
                  onClick={() =>
                    act(() => api.setRole(view.id, m.id, m.role === 'admin' ? 'member' : 'admin'))
                  }
                >
                  {m.role === 'admin' ? t.group.removeAdmin : t.group.makeAdmin}
                </button>
              )}
              {mayRelease(m) && (
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    if (window.confirm(t.group.releaseConfirm(m.name)))
                      void act(() => api.release(view.id, m.id));
                  }}
                >
                  {t.group.release}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

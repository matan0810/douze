import { useCallback, useEffect, useState } from 'react';
import type { GroupView } from '../../../shared/groups';
import { api, type Failure } from '../../net/api';
import { membership, remember, type Membership } from '../../state/memberships';

export type GroupState =
  | { kind: 'loading' }
  | { kind: 'out' }
  | { kind: 'failed'; error: Failure }
  | { kind: 'ready'; view: GroupView; me: Membership };

/** A group as this device sees it: loaded from the server, with the device's membership. */
export function useGroupView(id: string) {
  const [state, setState] = useState<GroupState>({ kind: 'loading' });

  const load = useCallback(async () => {
    const mine = membership(id);
    if (!mine) return setState({ kind: 'out' });
    setState({ kind: 'loading' });
    const answer = await api.readGroup(id, mine.token);
    if (!answer.ok)
      return setState(
        answer.error === 'unauthorized' ? { kind: 'out' } : { kind: 'failed', error: answer.error },
      );
    const fresh = { ...mine, groupName: answer.value.name, myName: answer.value.me.name };
    remember(fresh);
    setState({ kind: 'ready', view: answer.value, me: fresh });
  }, [id]);

  useEffect(() => {
    // The first load starts here and sets its state when the server answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /** Shows a view the server sent back after a change, without another round trip. */
  const show = (view: GroupView) =>
    setState((now) => (now.kind === 'ready' ? { ...now, view } : now));

  return { state, reload: load, show };
}

import { useCallback, useEffect, useState } from 'react';
import type { GroupView } from '../../../shared/groups';
import { api, type Failure } from '../../net/api';
import { useSession } from '../../state/session';

export type GroupState =
  | { kind: 'loading' }
  /** Nobody is signed in on this device. */
  | { kind: 'signedOut' }
  /** Signed in, but not a member of this group. */
  | { kind: 'out' }
  | { kind: 'failed'; error: Failure }
  | { kind: 'ready'; view: GroupView };

/** A group as the signed-in person sees it, loaded from the server. */
export function useGroupView(id: string) {
  const session = useSession();
  const [state, setState] = useState<GroupState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!session) return setState({ kind: 'signedOut' });
    setState({ kind: 'loading' });
    const answer = await api.readGroup(id);
    if (!answer.ok)
      return setState(
        answer.error === 'unauthorized' ? { kind: 'out' } : { kind: 'failed', error: answer.error },
      );
    setState({ kind: 'ready', view: answer.value });
  }, [id, session]);

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

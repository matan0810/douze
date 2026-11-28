import { useCallback, useEffect, useState } from 'react';
import type { YearView } from '../../../shared/years';
import { api, type Failure } from '../../net/api';

export type YearState =
  | { kind: 'loading' }
  | { kind: 'failed'; error: Failure }
  | { kind: 'ready'; view: YearView; at: number };

/**
 * A group's year from the server. `at` is this device's clock when it answered, so a
 * countdown runs on the server's time: server now plus what has passed here since.
 */
export function useYearView(group: string, enabled: boolean, year: number) {
  const [state, setState] = useState<YearState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!enabled) return;
    const answer = await api.readYear(group, year);
    setState(
      answer.ok
        ? { kind: 'ready', view: answer.value, at: Date.now() }
        : { kind: 'failed', error: answer.error },
    );
  }, [group, enabled, year]);

  useEffect(() => {
    // The first load starts here and sets its state when the server answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const show = (view: YearView) => setState({ kind: 'ready', view, at: Date.now() });

  return { state, reload: load, show };
}

import { can } from '../../../shared/capabilities';
import type { Entry, Stage } from '../../../shared/years';
import { groupGame, knownResult } from '../../domain/groupYear';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { useToast } from '../../ui/toastContext';
import { SignInButton } from '../groups/SignInButton';
import { useGroupView } from '../groups/useGroupView';
import { LockLine } from './LockLine';
import { MyEntry } from './MyEntry';
import { ResultEntry } from './ResultEntry';
import { Revealed } from './Revealed';
import { StagesBar } from './StagesBar';
import { useYearView } from './useYearView';
import { WhoIsDone } from './WhoIsDone';
import styles from './GroupYear.module.css';

interface Props {
  id: string;
  year: number;
  stage: Stage;
}

/**
 * A group's year, one stage at a time: one's own prediction, open through the show until
 * the results are read; who has finished; and, once a manager closes the stage, everyone's
 * predictions and the table.
 */
export function GroupYearScreen({ id, year, stage: wanted }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const group = useGroupView(id);
  const { state, show } = useYearView(id, group.state.kind === 'ready', year);
  const base = useGame(year);
  const back = (
    <a className="btn btn-quiet" href={routeHash({ name: 'group', id })}>
      {t.groupYear.back}
    </a>
  );
  const title = (lead: string) => (
    <PageTitle
      eyebrow={t.eyebrow.group}
      start={t.groupYear.titleStart}
      end={t.groupYear.titleEnd(year)}
      lead={lead}
      aside={back}
    />
  );

  if (group.state.kind !== 'ready' || state.kind !== 'ready')
    return (
      <div className={styles.page}>
        {title('')}
        {group.state.kind === 'signedOut' ? (
          <SignInButton />
        ) : group.state.kind === 'out' ? (
          <p className="note note-warn">{t.group.signedOut}</p>
        ) : state.kind === 'failed' ? (
          <p className="note note-warn" role="alert">
            {t.errors[state.error]}
          </p>
        ) : (
          <p className={styles.muted}>{t.group.loading}</p>
        )}
      </div>
    );

  const { view } = group.state;
  const year$ = state.view;
  const stage = year$.stages.find((s) => s.stage === wanted) ?? year$.stages[0];
  if (!stage)
    return (
      <div className={styles.page}>
        {title(view.name)}
        <p className="empty frame">{t.groupYear.noStages}</p>
      </div>
    );

  const save = async (entry: Entry) => {
    const answer = await api.saveEntry(id, year, stage.stage, entry);
    if (!answer.ok) {
      toast(t.errors[answer.error]);
      return false;
    }
    show(answer.value);
    toast(t.groupYear.saved);
    return true;
  };
  const close = async () => {
    if (!window.confirm(t.groupYear.closeConfirm)) return;
    const answer = await api.closeStage(id, year, stage.stage);
    if (!answer.ok) return toast(t.errors[answer.error]);
    show(answer.value);
    toast(t.groupYear.closed);
  };

  const setResult = async (result: string[] | null) => {
    const answer = await api.setResult(id, year, stage.stage, result);
    if (!answer.ok) {
      toast(t.errors[answer.error]);
      return false;
    }
    show(answer.value);
    toast(t.groupYear.resultSaved);
    return true;
  };

  return (
    <div className={styles.page}>
      {title(view.name)}
      <StagesBar group={id} year={year} stages={year$.stages} current={stage.stage} />
      <div className={styles.stack}>
        <LockLine
          stage={stage}
          onClose={can(view.me.role, 'settings.write') ? () => void close() : undefined}
        />
        <MyEntry key={stage.stage} stage={stage} me={view.me.id} onSave={save} />
        <WhoIsDone stage={stage} members={view.members} />
        {stage.locked && can(view.me.role, 'results.write') && (
          <ResultEntry
            key={`result-${stage.stage}`}
            stage={stage}
            known={knownResult(stage, base)}
            onSave={setResult}
          />
        )}
        {stage.locked ? (
          <Revealed stage={stage} game={groupGame(year$, view.members)} members={view.members} />
        ) : (
          <p className="note">{t.groupYear.hidden}</p>
        )}
      </div>
    </div>
  );
}

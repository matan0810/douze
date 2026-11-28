import { useState, type FormEvent } from 'react';
import { localMoment, stagesFromGame } from '../../domain/groupYear';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { useGames } from '../../state/context';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toastContext';
import styles from './Groups.module.css';

/**
 * A manager puts a year in the group: its stages as this phone has them (`stagesFromGame`),
 * open until the results are read. Publishing again updates the stages; a closed stage keeps
 * its countries (the server refuses).
 */
export function PublishYear({ group }: { group: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { games, years } = useGames();
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [date, setDate] = useState(games.get(year)?.date ?? '');
  const [busy, setBusy] = useState(false);

  const choose = (next: number) => {
    setYear(next);
    setDate(games.get(next)?.date ?? '');
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const game = games.get(year);
    if (localMoment(date, '12:00') === undefined) return toast(t.groupYear.badDate);
    const stages = game ? stagesFromGame(game, date) : [];
    if (!stages.length) return toast(t.groupYear.noField);
    setBusy(true);
    for (const [stage, setup] of stages) {
      const answer = await api.setStage(group, year, stage, setup);
      if (!answer.ok) {
        setBusy(false);
        return toast(t.errors[answer.error]);
      }
    }
    setBusy(false);
    toast(t.groupYear.published);
    navigate({ name: 'groupYear', id: group, year, stage: 'final' });
  };

  return (
    <form className={styles.form} onSubmit={publish} aria-labelledby="play">
      <h3 id="play" className="section-label">
        {t.groupYear.play}
      </h3>
      <p className={styles.muted}>{t.groupYear.playHint}</p>
      <label className={styles.field}>
        <span>{t.groupYear.year}</span>
        <select className="input" value={year} onChange={(e) => choose(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>{t.groupYear.date}</span>
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        <Icon name="plus" size={16} />
        {t.groupYear.publish}
      </button>
    </form>
  );
}

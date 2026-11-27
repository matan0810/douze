import { countryById } from '../../domain/archive';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import styles from './PlanScreen.module.css';

interface Props {
  title: string;
  songs: readonly string[];
  onSlot: (index: number) => void;
  onBack: () => void;
}

/** A drawer's songs with a "here" between each two: where the song on stage goes. */
export function DrawerList({ title, songs, onSlot, onBack }: Props) {
  const { t, language } = useI18n();
  const slot = (index: number) => (
    <li key={`slot-${index}`}>
      <button
        type="button"
        className={styles.slot}
        aria-label={t.plan.slot(index + 1)}
        onClick={() => onSlot(index)}
      >
        {t.plan.here}
      </button>
    </li>
  );
  return (
    <div className={styles.slots}>
      <h2 className="section-label">{title}</h2>
      <ol className={styles.slotList}>
        {slot(0)}
        {songs.flatMap((id, i) => [
          <li key={id} className={styles.placed}>
            <Flag country={countryById.get(id)} size="sm" />
            {countryById.get(id)?.name[language] ?? id}
          </li>,
          slot(i + 1),
        ])}
      </ol>
      <button type="button" className="btn btn-quiet" onClick={onBack}>
        {t.plan.back}
      </button>
    </div>
  );
}

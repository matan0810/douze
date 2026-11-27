import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Country } from '../domain/types';
import { useI18n } from '../i18n/context';
import { Flag } from '../ui/Flag';
import { Icon } from '../ui/Icon';
import { PlaceBadge } from '../ui/PlaceBadge';
import { GripIcon } from './GripIcon';
import styles from './CountryPicker.module.css';

interface Props {
  country: Country;
  place: number;
  onRemove: () => void;
  /** In a year with jokers: whether this is the joker, and the way to make it one. */
  joker?: boolean;
  onJoker?: () => void;
}

/** One chosen country: a handle to drag it, its place, its flag and name, and remove. */
export function SortableRow({ country, place, onRemove, joker, onJoker }: Props) {
  const { t, language } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: country.id,
  });
  const other = language === 'he' ? country.name.en : country.name.he;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.row} ${isDragging ? styles.dragging : ''}`}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={t.picker.dragLabel(country.name[language], place)}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <PlaceBadge place={place} />
      <Flag country={country} size="lg" />
      <span className={styles.name}>{country.name[language]}</span>
      <span className={styles.other} lang={language === 'he' ? 'en' : 'he'}>
        {other}
      </span>
      {onJoker && (
        <button
          type="button"
          className={joker ? `${styles.joker} ${styles.jokerOn}` : styles.joker}
          aria-pressed={joker}
          aria-label={t.picker.joker(country.name[language])}
          title={t.picker.joker(country.name[language])}
          onClick={onJoker}
        >
          <Icon name="joker" size={16} />
        </button>
      )}
      <button
        type="button"
        className={styles.remove}
        aria-label={`${t.remove} ${country.name[language]}`}
        onClick={onRemove}
      >
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

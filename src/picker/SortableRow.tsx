import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Country } from '../domain/types';
import { useI18n } from '../i18n/context';
import { Flag } from '../ui/Flag';
import { PlaceBadge } from '../ui/PlaceBadge';
import { GripIcon } from './GripIcon';
import styles from './CountryPicker.module.css';

interface Props {
  country: Country;
  place: number;
  onRemove: () => void;
}

/** One chosen country: a handle to drag it, its place, its flag and name, and remove. */
export function SortableRow({ country, place, onRemove }: Props) {
  const { t, language } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: country.id,
  });
  const other = language === 'he' ? country.name.en : country.name.he;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.row} ${isDragging ? `${styles.dragging} glass-purple` : 'glass'}`}
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
      <button
        type="button"
        className={styles.remove}
        aria-label={`${t.remove} ${country.name[language]}`}
        onClick={onRemove}
      >
        ✕
      </button>
    </li>
  );
}

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useId, useMemo, useRef, useState } from 'react';
import { countryById } from '../domain/archive';
import type { Country } from '../domain/types';
import { useI18n } from '../i18n/context';
import { Flag } from '../ui/Flag';
import { GripIcon } from './GripIcon';
import { suggest } from './search';
import { SortableRow } from './SortableRow';
import styles from './CountryPicker.module.css';

interface Props {
  /** The countries to choose from, by id. */
  field: readonly string[];
  /** The chosen order, first place first. */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}

/** How many suggestions show at once: enough to see the choice, short enough on a phone. */
const SHOWN = 8;

/**
 * Builds a ranking: type a name (Hebrew or English) and press Enter to put the country in
 * the next place; drag a row's handle, or use it with the arrow keys, to move it.
 */
export function CountryPicker({ field, selected, onChange, emptyHint }: Props) {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const remaining = useMemo(
    () =>
      field
        .filter((id) => !selected.includes(id))
        .map((id) => countryById.get(id))
        .filter((c): c is Country => !!c),
    [field, selected],
  );
  const matches = useMemo(() => suggest(remaining, query).slice(0, SHOWN), [remaining, query]);
  const chosen = selected.map((id) => countryById.get(id)).filter((c): c is Country => !!c);
  const done = remaining.length === 0;
  const open = !done && query.trim() !== '';

  const pick = (id: string) => {
    onChange([...selected, id]);
    setQuery('');
    setActive(0);
    input.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const country = matches[active];
      if (open && country) pick(country.id);
    } else if (e.key === 'Escape') {
      setQuery('');
    } else if (e.key === 'Backspace' && !query && selected.length) {
      onChange(selected.slice(0, -1));
    }
  };

  const onDragEnd = ({ active: moved, over }: DragEndEvent) => {
    if (!over || moved.id === over.id) return;
    const from = selected.indexOf(String(moved.id));
    const to = selected.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onChange(arrayMove([...selected], from, to));
  };

  return (
    <div className={styles.picker}>
      <div className={styles.search}>
        <div className={styles.box}>
          {!done && <span className={`${styles.next} num`}>{selected.length + 1}</span>}
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={done ? t.picker.done : t.picker.placeholder(selected.length + 1)}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder={done ? t.picker.done : t.picker.placeholder(selected.length + 1)}
            disabled={done}
            dir="auto"
            className={styles.query}
          />
          {selected.length > 0 && (
            <button type="button" className={styles.clear} onClick={() => onChange([])}>
              {t.picker.clearAll}
            </button>
          )}
        </div>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t.picker.suggestions}
            className={`${styles.menu} glass-purple`}
          >
            {matches.length === 0 && <li className={styles.noMatch}>{t.picker.noMatch}</li>}
            {matches.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  className={
                    i === active ? `${styles.option} ${styles.activeOption}` : styles.option
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c.id);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <Flag country={c} size="md" />
                  <span className={styles.optionName}>{c.name[language]}</span>
                  <span className={styles.other}>{language === 'he' ? c.name.en : c.name.he}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {chosen.length > 0 ? (
        <>
          <p className={styles.hint}>
            <GripIcon size={12} />
            {t.picker.dragHint}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={[...selected]} strategy={verticalListSortingStrategy}>
              <ol className={styles.rows}>
                {chosen.map((country, i) => (
                  <SortableRow
                    key={country.id}
                    country={country}
                    place={i + 1}
                    onRemove={() => onChange(selected.filter((id) => id !== country.id))}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <p className="empty">{emptyHint ?? t.picker.empty}</p>
      )}
    </div>
  );
}

import { isFinalEntry, type StageView } from '../../../shared/years';
import { countryById } from '../../domain/archive';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import styles from './GroupYear.module.css';

/** Each member's prediction as a row of flags: in order for the final, as picked for a semi. */
export function EntryList({
  stage,
  names,
}: {
  stage: StageView;
  names: ReadonlyMap<string, string>;
}) {
  const { t, language } = useI18n();
  const flag = (id: string, mark?: string) => {
    const country = countryById.get(id);
    const name = country?.name[language] ?? id;
    return (
      <li key={id} className={styles.flag} title={mark ? `${name} · ${mark}` : name}>
        <Flag country={country} />
        {mark && <span className={styles.mark}>{mark}</span>}
        <span className="visually-hidden">{mark ? `${name}, ${mark}` : name}</span>
      </li>
    );
  };
  return (
    <ul className={styles.entries}>
      {stage.entries.map(({ member, entry }) => (
        <li key={member} className={styles.entry}>
          <span className={styles.name}>{names.get(member) ?? '—'}</span>
          <ol className={styles.flags}>
            {isFinalEntry(entry)
              ? entry.order.map((id) =>
                  flag(id, id === entry.joker ? t.groupYear.joker : undefined),
                )
              : [
                  ...entry.picks.map((id) => flag(id)),
                  ...(entry.reserve ? [flag(entry.reserve, t.groupYear.reserve)] : []),
                ]}
          </ol>
        </li>
      ))}
    </ul>
  );
}

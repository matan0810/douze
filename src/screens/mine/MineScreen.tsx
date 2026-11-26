import { useState } from 'react';
import { archive } from '../../domain/archive';
import { cleanName, MAX_NAME } from '../../domain/game';
import { decodeOrder, predictionHash } from '../../domain/links';
import { isComplete } from '../../domain/scoring';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useShare } from '../../hooks/useShare';
import { useI18n } from '../../i18n/context';
import { CountryPicker } from '../../picker/CountryPicker';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import styles from './MineScreen.module.css';

const NAME_KEY = 'eurorank:my-name';
const readName = (v: unknown) => (typeof v === 'string' ? cleanName(v) : undefined);

/**
 * A friend's own prediction, made on their phone and sent back as a link. It is kept here
 * as a draft (per year) until sent, so a closed tab loses nothing.
 */
export function MineScreen({ year, encodedField }: { year: number; encodedField?: string }) {
  const { t } = useI18n();
  const share = useShare();
  const game = useGame(year);
  const field = game?.finalists ?? decodeOrder(encodedField ?? '', archive.countries) ?? [];
  const [name, setName] = useLocalStorage(NAME_KEY, '', readName);
  const [stored, setStored] = useLocalStorage<string[]>(
    `eurorank:my-prediction:${year}`,
    [],
    (v) => (Array.isArray(v) && v.every((id) => typeof id === 'string') ? v : undefined),
  );
  const [order, setOrderState] = useState(() => stored.filter((id) => field.includes(id)));
  const setOrder = (next: string[]) => {
    setOrderState(next);
    setStored(next);
  };
  const ready = !!cleanName(name) && isComplete(order, field);

  return (
    <div className={styles.page}>
      <PageTitle
        start={t.mine.titleStart}
        end={t.mine.titleEnd}
        tone="purple"
        lead={t.mine.lead(year)}
      />
      {!field.length ? (
        <p className="empty glass panel">{t.mine.noFinalists}</p>
      ) : (
        <div className={`${styles.panel} glass-purple panel`}>
          <label className={styles.name}>
            <span className="section-label">{t.mine.name}</span>
            <input
              className="input"
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.mine.namePlaceholder}
            />
          </label>
          <CountryPicker field={field} selected={order} onChange={setOrder} />
          <div className={styles.send}>
            {!ready && (
              <p className="note note-info">
                {!cleanName(name) ? t.mine.needName : t.mine.needAll(field.length)}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ready}
              onClick={() =>
                share(
                  predictionHash(year, name, order, archive.countries),
                  t.mine.shareText(cleanName(name), year),
                )
              }
            >
              {t.mine.send}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

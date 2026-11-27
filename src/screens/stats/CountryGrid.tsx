import { countryById } from '../../domain/archive';
import type { GamePlayer } from '../../domain/game';
import type { GridRow } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import { closeness } from '../results/closeness';
import { Icon } from '../../ui/Icon';
import { Token } from '../../ui/Token';
import type { Piece } from '../../domain/pieces';
import page from './StatsScreen.module.css';
import styles from './CountryGrid.module.css';

interface Props {
  rows: GridRow[];
  players: GamePlayer[];
  pieces: ReadonlyMap<string, Piece>;
}

/** A surprise as a signed number with one decimal: +3.7, −2, 0. */
function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0';
}

/** Every country in the order it finished, with the place each of us gave it. */
export function CountryGrid({ rows, players, pieces }: Props) {
  const { t, language } = useI18n();
  return (
    <section className={page.section} aria-labelledby="grid-title">
      <div className={page.sectionHead}>
        <h2 id="grid-title">
          <Icon name="grid" size={16} />
          {t.stats.grid}
        </h2>
        <p>{t.stats.gridHint}</p>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th className={styles.country}>{t.breakdown.country}</th>
              {players.map((p) => (
                <th key={p.id}>{p.name[language]}</th>
              ))}
              <th>{t.stats.average}</th>
              <th title={t.stats.surpriseTitle}>{t.stats.surpriseCol}</th>
              <th>{t.stats.closestCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const country = countryById.get(row.country);
              return (
                <tr key={row.country}>
                  <td className={`${styles.place} num`}>{row.actual}</td>
                  <td className={styles.country}>
                    <span className={styles.name}>
                      <Flag country={country} size="sm" />
                      {country?.name[language]}
                    </span>
                  </td>
                  {row.predicted.map((place, i) => (
                    <td key={players[i]?.id ?? i}>
                      <span
                        className={`${styles.cell} ${styles[closeness(Math.abs(place - row.actual))]} num`}
                      >
                        {place}
                      </span>
                    </td>
                  ))}
                  <td className={`${styles.average} num`}>
                    {(Math.round(row.average * 10) / 10).toString()}
                  </td>
                  <td
                    className={`num ${row.surprise >= 1 ? styles.up : row.surprise <= -1 ? styles.down : styles.average}`}
                  >
                    <bdi>{signed(row.surprise)}</bdi>
                  </td>
                  <td>
                    <span className={styles.closest}>
                      {row.closest.map((id) => {
                        const player = players.find((p) => p.id === id);
                        const name = player?.name[language] ?? id;
                        return (
                          <span key={id} title={name}>
                            <Token name={name} piece={pieces.get(id) ?? 'violet'} size="sm" />
                          </span>
                        );
                      })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

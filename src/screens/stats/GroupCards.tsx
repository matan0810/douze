import { countryById } from '../../domain/archive';
import type { Piece } from '../../domain/pieces';
import { BIG_FIVE, calls, HOME, twins } from '../../domain/profile';
import type { Game } from '../../domain/game';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import { Icon } from '../../ui/Icon';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import page from './StatsScreen.module.css';
import styles from './GroupCards.module.css';

interface Props {
  game: Game;
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
}

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

/** The group together: taste twins, the Israeli heart and the big five. */
export function GroupCards({ game, names, pieces }: Props) {
  const { t, language } = useI18n();
  const name = (id: string) => names.get(id) ?? id;
  const pairs = twins(game);
  const [near, far] = [pairs[0], pairs.length > 1 ? pairs.at(-1) : undefined];
  const home = calls(game, [HOME])[0];
  const host = game.hostCountry;
  const big = calls(game, host ? [host, ...BIG_FIVE.filter((id) => id !== host)] : BIG_FIVE);
  const places = (row: { predicted: { player: string; place: number }[] }) => (
    <span className={styles.places}>
      {row.predicted.map((p) => {
        const piece = pieces.get(p.player) ?? 'violet';
        return (
          <span key={p.player} className={styles.place} style={pieceColour(piece)}>
            <Token name={name(p.player)} piece={piece} size="sm" />
            <span className="num">{p.place}</span>
          </span>
        );
      })}
    </span>
  );
  return (
    <section className={page.section} aria-labelledby="group-title">
      <div className={page.sectionHead}>
        <h2 id="group-title">
          <Icon name="crowd" size={16} />
          {t.stats.group}
        </h2>
      </div>
      <div className={styles.cards}>
        {near && (
          <article className={styles.card}>
            <h3>{t.stats.twins}</h3>
            <p>{t.stats.twinsText(name(near.a), name(near.b), oneDecimal(near.apart))}</p>
            {far && <p>{t.stats.farText(name(far.a), name(far.b), oneDecimal(far.apart))}</p>}
          </article>
        )}
        {home && (
          <article className={styles.card}>
            <h3>
              <Flag country={countryById.get(HOME)} size="sm" />
              {t.stats.home}
            </h3>
            <p>{t.stats.homeText(home.actual)}</p>
            {places(home)}
          </article>
        )}
        {big.length > 0 && (
          <article className={styles.card}>
            <h3>{t.stats.bigFive}</h3>
            <p className={styles.hint}>{t.stats.bigFiveHint}</p>
            <ul className={styles.rows}>
              {big.map((row) => (
                <li key={row.country}>
                  <span className={styles.country}>
                    <Flag country={countryById.get(row.country)} size="sm" />
                    {countryById.get(row.country)?.name[language]}
                    {row.country === host && <span className={styles.tag}>{t.stats.hostTag}</span>}
                    <span className={`${styles.actual} num`}>
                      {t.stats.finished} {row.actual}
                    </span>
                  </span>
                  {places(row)}
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
}

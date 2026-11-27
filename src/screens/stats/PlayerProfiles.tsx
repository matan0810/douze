import { countryName } from '../../domain/archive';
import type { Piece } from '../../domain/pieces';
import { topSize, type PlayerProfile } from '../../domain/profile';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import page from './StatsScreen.module.css';
import styles from './PlayerProfiles.module.css';

interface Props {
  profiles: PlayerProfile[];
  size: number;
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
}

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

/** A card per player: their top ten, biggest miss, bold call, and top against bottom. */
export function PlayerProfiles({ profiles, size, names, pieces }: Props) {
  const { t, language } = useI18n();
  const country = (id: string) => countryName(id, language);
  return (
    <section className={page.section} aria-labelledby="profiles-title">
      <div className={page.sectionHead}>
        <h2 id="profiles-title">
          <Icon name="players" size={16} />
          {t.stats.profiles}
        </h2>
        <p>{t.stats.profilesHint}</p>
      </div>
      <ul className={styles.cards}>
        {profiles.map((p) => {
          const name = names.get(p.player) ?? p.player;
          const piece = pieces.get(p.player) ?? 'violet';
          return (
            <li key={p.player} className={`piece-card ${styles.card}`} style={pieceColour(piece)}>
              <span className={styles.who}>
                <Token name={name} piece={piece} />
                {name}
              </span>
              <dl className={styles.facts}>
                <dt>{t.stats.topTen}</dt>
                <dd className={`${styles.big} num`}>
                  {t.stats.topTenText(p.topTen, topSize(size))}
                </dd>
                <dt>{t.stats.miss}</dt>
                <dd>
                  {t.stats.missText(country(p.miss.country), p.miss.predicted, p.miss.actual)}
                </dd>
                <dt>{t.stats.bold}</dt>
                <dd>
                  {p.bold
                    ? t.stats.boldText(
                        country(p.bold.country),
                        p.bold.predicted,
                        oneDecimal(p.bold.average),
                        p.bold.actual,
                      )
                    : t.stats.noBold}
                </dd>
                <dt>
                  {t.stats.halves}
                  <span className={styles.tag}>
                    {p.halves.top <= p.halves.bottom ? t.stats.strongTop : t.stats.strongBottom}
                  </span>
                </dt>
                <dd>{t.stats.halvesText(oneDecimal(p.halves.top), oneDecimal(p.halves.bottom))}</dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { countryById } from '../../domain/archive';
import type { Piece } from '../../domain/pieces';
import { semiBadges, type StageBadge } from '../../domain/badges';
import { qualifierCount, type Semi, type SemiScore } from '../../domain/semis';
import { useCountUp } from '../../hooks/useCountUp';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import { pieceColour } from '../../ui/pieceColour';
import { StageStickers } from '../../ui/StageStickers';
import { Token } from '../../ui/Token';
import styles from './SemiBoard.module.css';

interface Props {
  semi: Semi;
  table: SemiScore[];
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
}

const STEP = 0.35;

/**
 * The semi's own table, landing like the final's: each player's points, how many of their
 * picks qualified, and the picks themselves, lit when they went through.
 */
export function SemiBoard({ semi, table, names, pieces }: Props) {
  const { t } = useI18n();
  const stickers = semiBadges(table);
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className="section-label">{t.semi.board}</h2>
        <p className={styles.hint}>{t.semi.boardHint}</p>
      </div>
      <ol className={styles.list}>
        {table.map((s, i) => (
          <Row
            key={s.player}
            semi={semi}
            score={s}
            name={names.get(s.player) ?? s.player}
            piece={pieces.get(s.player) ?? 'violet'}
            badges={stickers.get(s.player) ?? []}
            landsAt={(table.length - 1 - i) * STEP}
          />
        ))}
      </ol>
    </section>
  );
}

function Row({
  semi,
  score: s,
  name,
  piece,
  badges,
  landsAt,
}: {
  semi: Semi;
  score: SemiScore;
  name: string;
  piece: Piece;
  badges: readonly StageBadge[];
  landsAt: number;
}) {
  const { t, language } = useI18n();
  const points = useCountUp(s.points, (landsAt + 0.3) * 1000);
  const pick = semi.predictions.find((p) => p.player === s.player);
  const qualified = new Set(semi.qualifiers ?? []);
  const flag = (id: string) => (
    <span
      key={id}
      className={qualified.has(id) ? styles.hit : styles.miss}
      title={countryById.get(id)?.name[language]}
    >
      <Flag country={countryById.get(id)} size="sm" />
    </span>
  );
  return (
    <li
      className={`land ${styles.row} piece-card ${s.rank === 1 ? `${styles.first} piece-card-first` : ''}`}
      style={{ ...pieceColour(piece), animationDelay: `${landsAt}s` }}
    >
      <span className={`${styles.place} num`} aria-hidden="true">
        {String(s.rank).padStart(2, '0')}
      </span>
      <span className="visually-hidden">{t.ordinal(s.rank)}</span>
      <Token name={name} piece={piece} />
      <span className={styles.info}>
        <span className={styles.name}>
          {name}
          <StageStickers badges={badges} delay={landsAt + 0.6} />
        </span>
        <span className={styles.meta}>{t.semi.hits(s.hits, qualifierCount(semi.countries))}</span>
        {pick && (
          <span className={styles.flags} aria-hidden="true">
            {pick.picks.map(flag)}
            {pick.reserve && (
              <>
                <span className={styles.sep}>11</span>
                {flag(pick.reserve)}
              </>
            )}
          </span>
        )}
      </span>
      <span className={`${styles.score} num`} aria-label={String(s.points)}>
        {points}
      </span>
    </li>
  );
}

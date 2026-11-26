import { useState } from 'react';
import { addPlayer, removePlayer, setOrder } from '../../domain/game';
import { useI18n } from '../../i18n/context';
import { useGame, useGames } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { YearSelect } from '../../ui/YearSelect';
import { FinalistsPanel } from './FinalistsPanel';
import { PlayerCard } from './PlayerCard';
import { PredictionEditor } from './PredictionEditor';
import styles from './PlayersScreen.module.css';

/** The players of a final and their predictions, with the ways to invite more. */
export function PlayersScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const { update } = useGames();
  const game = useGame(year);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  if (!game) return null;
  const player = game.players.find((p) => p.id === editing);

  const add = () => {
    if (!name.trim()) return;
    update(year, (g) => addPlayer(g, name));
    setName('');
  };

  return (
    <div className={styles.page}>
      <PageTitle
        start={t.players.titleStart}
        end={t.players.titleEnd}
        tone="purple"
        lead={t.players.lead}
        aside={<YearSelect year={year} view="players" />}
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <form
            className={`${styles.add} glass`}
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label htmlFor="new-player" className="section-label">
              {t.players.addTitle}
            </label>
            <div className={styles.addRow}>
              <input
                id="new-player"
                className="input"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.players.namePlaceholder}
              />
              <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                {t.players.add}
              </button>
            </div>
          </form>

          {game.players.length === 0 ? (
            <div className="empty fade">
              <div className={styles.emptyIcon} aria-hidden="true">
                👥
              </div>
              <p>{t.players.empty}</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {game.players.map((p) => (
                <PlayerCard
                  key={p.id}
                  game={game}
                  player={p}
                  onEdit={() => setEditing(p.id)}
                  onDelete={() => {
                    if (window.confirm(t.players.confirmDelete(p.name[language])))
                      update(year, (g) => removePlayer(g, p.id));
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <aside className={styles.side}>
          <FinalistsPanel game={game} />
        </aside>
      </div>

      {player && (
        <PredictionEditor
          key={player.id}
          name={player.name[language]}
          field={game.finalists}
          initial={player.order}
          onSave={(order) => {
            update(year, (g) => setOrder(g, player.id, order));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

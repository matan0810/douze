import { addPlayer, differs, setResult, type Game } from '../../domain/game';
import type { SharedGroup } from '../../domain/links';
import { isComplete } from '../../domain/scoring';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { baselineGame } from '../../state/games';
import { useGame, useGames } from '../../state/context';
import { Avatar } from '../../ui/Avatar';
import { PageTitle } from '../../ui/PageTitle';
import styles from './ReceivedScreen.module.css';

/** The group's final as a game of this device. Archive players keep their identity. */
function asGame(group: SharedGroup): Game {
  const archived = baselineGame(group.year);
  let game: Game = { year: group.year, finalists: group.finalists, result: null, players: [] };
  for (const p of group.players) {
    const known = archived.players.find((a) => a.name.he === p.name || a.name.en === p.name);
    game = addPlayer(game, p.name, p.order, known?.id);
    const added = game.players.at(-1);
    if (known && added) added.name = known.name;
  }
  return setResult(game, group.result);
}

/** A whole group sent by link: kept on this device, replacing what was here after asking. */
export function ReceivedGroup({ group }: { group: SharedGroup }) {
  const { t, language } = useI18n();
  const { put } = useGames();
  const current = useGame(group.year);
  const incoming = asGame(group);

  const keep = () => {
    const mine = current && differs(current, baselineGame(group.year));
    if (mine && differs(current, incoming) && !window.confirm(t.received.confirmReplace)) return;
    put(incoming);
    navigate({ name: 'final', year: group.year, view: 'table' });
  };

  return (
    <>
      <PageTitle
        start={t.received.groupTitle(group.year)}
        end=""
        tone="gold"
        lead={t.received.groupLead(group.players.length)}
      />
      <div className={`${styles.panel} glass-gold panel`}>
        <button type="button" className="btn btn-gold" onClick={keep}>
          {t.received.keep}
        </button>
        <ul className={styles.players}>
          {incoming.players.map((p) => (
            <li key={p.id} className={`${styles.player} glass`}>
              <Avatar name={p.name[language]} size={36} />
              <span>{p.name[language]}</span>
              <span className={`${styles.count} num`}>
                {isComplete(p.order, incoming.finalists)
                  ? t.players.complete
                  : `${p.order.length}/${incoming.finalists.length}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

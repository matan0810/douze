import { countryById, countryName } from '../../domain/archive';
import type { Insights } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import { Icon, type IconName } from '../../ui/Icon';
import page from './StatsScreen.module.css';
import styles from './InsightCards.module.css';

interface Props {
  found: Insights;
  names: ReadonlyMap<string, string>;
}

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

/** Six short stories of the final, each with the country or the people it is about. */
export function InsightCards({ found, names }: Props) {
  const { t, language } = useI18n();
  const name = (id: string) => countryName(id, language);
  const winner = found.prophets;
  const list = new Intl.ListFormat(language, { type: 'conjunction' });
  const cards: { icon: IconName; title: string; country?: string; text: string }[] = [
    {
      icon: 'rise',
      title: t.stats.surprise,
      country: found.surprise.country,
      text: t.stats.surpriseText(
        name(found.surprise.country),
        oneDecimal(found.surprise.average),
        found.surprise.actual,
      ),
    },
    {
      icon: 'fall',
      title: t.stats.letdown,
      country: found.letdown.country,
      text: t.stats.letdownText(
        name(found.letdown.country),
        oneDecimal(found.letdown.average),
        found.letdown.actual,
      ),
    },
    {
      icon: 'crowd',
      title: t.stats.crowd,
      text: t.stats.crowdText(found.crowd.total, found.crowd.rank),
    },
    {
      icon: 'prophet',
      title: t.stats.prophet,
      country: found.winner,
      text: t.stats.prophetText(
        list.format(winner.players.map((id) => names.get(id) ?? id)),
        name(found.winner),
        winner.predicted,
      ),
    },
    {
      icon: 'agree',
      title: t.stats.agreed,
      country: found.agreed.country,
      text: t.stats.agreedText(name(found.agreed.country), found.agreed.spread),
    },
    {
      icon: 'split',
      title: t.stats.split,
      country: found.split.country,
      text: t.stats.splitText(name(found.split.country), found.split.spread),
    },
  ];

  return (
    <section className={page.section} aria-labelledby="learned">
      <div className={page.sectionHead}>
        <h2 id="learned">
          <Icon name="scoring" size={16} />
          {t.stats.learned}
        </h2>
      </div>
      <ul className={styles.cards}>
        {cards.map((card, i) => (
          <li
            key={card.title}
            className={`${styles.card} rise`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className={styles.title}>
              <Icon name={card.icon} size={18} />
              <h3>{card.title}</h3>
              {card.country && <Flag country={countryById.get(card.country)} size="md" />}
            </div>
            <p>{card.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { archive } from '../../domain/archive';
import { readGroupLink, readPredictionLink } from '../../domain/links';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { PageTitle } from '../../ui/PageTitle';
import { ReceivedGroup } from './ReceivedGroup';
import { ReceivedPrediction } from './ReceivedPrediction';
import styles from './ReceivedScreen.module.css';

/** A link someone sent: one prediction, or a whole group. A broken link says so. */
export function ReceivedScreen({ kind, query }: { kind: 'prediction' | 'group'; query: string }) {
  const { t } = useI18n();
  const prediction =
    kind === 'prediction' ? readPredictionLink(query, archive.countries) : undefined;
  const group = kind === 'group' ? readGroupLink(query, archive.countries) : undefined;
  return (
    <div className={styles.page}>
      {prediction && <ReceivedPrediction year={prediction.year} shared={prediction.prediction} />}
      {group && <ReceivedGroup group={group} />}
      {!prediction && !group && (
        <>
          <PageTitle start="⚠" end="" tone="gold" lead={t.received.broken} />
          <a className="btn btn-primary" href={routeHash({ name: 'home' })}>
            {t.received.toHome}
          </a>
        </>
      )}
    </div>
  );
}

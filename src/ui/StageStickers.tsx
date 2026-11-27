import type { StageBadge } from '../domain/badges';
import { useI18n } from '../i18n/context';
import { Sticker } from './Sticker';

/** The stickers of a semi or of the season, slapped on one after another from `delay`. */
export function StageStickers({
  badges,
  delay = 0,
}: {
  badges: readonly StageBadge[];
  delay?: number;
}) {
  const { t } = useI18n();
  return (
    <>
      {badges.map((badge, i) => {
        const at = delay + i * 0.25;
        switch (badge.kind) {
          case 'champion':
            return (
              <Sticker key="champion" tone="gold" delay={at}>
                {t.badge.champion}
              </Sticker>
            );
          case 'perfect':
            return (
              <Sticker key="perfect" delay={at} title={t.badge.perfectTitle}>
                {t.badge.perfect}
              </Sticker>
            );
          case 'reserve':
            return (
              <Sticker key="reserve" delay={at} title={t.badge.reserveTitle}>
                {t.badge.reserve}
              </Sticker>
            );
        }
      })}
    </>
  );
}

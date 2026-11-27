import type { Badge } from '../../domain/badges';
import { useI18n } from '../../i18n/context';
import { Sticker } from '../../ui/Sticker';

/** A player's stickers of the final, slapped on one after another from `delay`. */
export function BadgeStickers({ badges, delay = 0 }: { badges: readonly Badge[]; delay?: number }) {
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
          case 'almost':
            return (
              <Sticker key="almost" delay={at} title={t.badge.almostTitle(badge.gap)}>
                {t.badge.almost}
              </Sticker>
            );
          case 'sharpshooter':
            return (
              <Sticker key="sharpshooter" delay={at} title={t.badge.sharpshooterTitle}>
                {t.badge.sharpshooter(badge.exact)}
              </Sticker>
            );
          case 'prophet':
            return (
              <Sticker key="prophet" delay={at} title={t.badge.prophetTitle(badge.place)}>
                {t.badge.prophet}
              </Sticker>
            );
        }
      })}
    </>
  );
}

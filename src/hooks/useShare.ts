import { useCallback } from 'react';
import { shareLink } from '../export/share';
import { useI18n } from '../i18n/context';
import { useToast } from '../ui/toastContext';
import { absoluteUrl } from './useRoute';

/** Shares a screen of the site by its address, and says so when the link was copied. */
export function useShare() {
  const { t } = useI18n();
  const toast = useToast();
  return useCallback(
    async (hash: string, title: string) => {
      const outcome = await shareLink(absoluteUrl(hash), title);
      if (outcome === 'copied') toast(t.copied);
      if (outcome === 'failed') toast(t.shareFailed);
    },
    [t, toast],
  );
}

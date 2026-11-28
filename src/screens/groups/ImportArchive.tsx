import { useState } from 'react';
import { archivedYears, archiveYearBody } from '../../domain/archiveImport';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toastContext';
import styles from './Groups.module.css';

/**
 * The group's owner puts the archive's years in the group, once (issue #6, step 2): every
 * stage already closed, with its result and everyone's prediction, so the history lives in
 * the group like any year played in it.
 */
export function ImportArchive({
  group,
  token,
  onDone,
}: {
  group: string;
  token: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const years = archivedYears();
  if (!years.length) return null;
  const range = years.length > 1 ? `${years[0]}–${years.at(-1)}` : String(years[0]);

  const run = async () => {
    if (!window.confirm(t.groupYear.importConfirm)) return;
    setBusy(true);
    for (const year of years) {
      const body = archiveYearBody(year);
      if (!body) continue;
      const answer = await api.importYear(group, token, year, body);
      if (!answer.ok) {
        setBusy(false);
        return toast(t.errors[answer.error]);
      }
    }
    setBusy(false);
    toast(t.groupYear.imported);
    onDone();
  };

  return (
    <section className={styles.form} aria-labelledby="archive">
      <h3 id="archive" className="section-label">
        {t.groupYear.importTitle}
      </h3>
      <p className={styles.muted}>{t.groupYear.importHint}</p>
      <button type="button" className="btn btn-line" disabled={busy} onClick={() => void run()}>
        <Icon name="history" size={16} />
        {t.groupYear.importButton(range)}
      </button>
    </section>
  );
}

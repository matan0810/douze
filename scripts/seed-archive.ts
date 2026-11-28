/**
 * Writes `worker/seed/archive.sql` from the archive (`src/data/`): the archive as a standard
 * group, applied to the database on every deploy (`deploy-worker.yml`). Run it again after the
 * archive changes; a test fails while the committed file is stale.
 *
 *   node scripts/seed-archive.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { archiveSeedSql } from './archiveSeed.ts';

const root = new URL('../', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const editions = readdirSync(new URL('src/data/editions/', root))
  .filter((file) => file.endsWith('.json'))
  .map((file) => read(`src/data/editions/${file}`));

writeFileSync(
  new URL('worker/seed/archive.sql', root),
  archiveSeedSql(read('src/data/players.json'), editions),
);
console.log('worker/seed/archive.sql written.');

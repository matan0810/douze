/**
 * Finds the Cloudflare D1 database with the given name, creating it if it does not exist,
 * and writes its id into the Worker's config in place of the placeholder, for this run only.
 *
 *   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/ensure-d1.ts <name> <config>
 *
 * Used by the Deploy Worker workflow, so the id never has to be copied by hand.
 */
import { readFile, writeFile } from 'node:fs/promises';

const PLACEHOLDER = 'REPLACE_WITH_D1_DATABASE_ID';
const API = 'https://api.cloudflare.com/client/v4';

const [name, configPath] = process.argv.slice(2);
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId } = process.env;
if (!name || !configPath || !token || !accountId)
  throw new Error('Usage: node scripts/ensure-d1.ts <name> <config>, with Cloudflare env vars');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function cloudflare(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${API}/accounts/${accountId}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body: unknown = await response.json();
  if (!isRecord(body) || body.success !== true) {
    const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors : [];
    const reasons = errors.map((e) => (isRecord(e) ? String(e.message) : '')).join('; ');
    throw new Error(`Cloudflare API ${path} failed: ${reasons || response.status}`);
  }
  return body.result;
}

/** The id of a database record, if it is one with this name. */
function idOf(value: unknown): string | undefined {
  return isRecord(value) && value.name === name && typeof value.uuid === 'string'
    ? value.uuid
    : undefined;
}

const found = await cloudflare(`/d1/database?name=${encodeURIComponent(name)}`);
let id = (Array.isArray(found) ? found : []).map(idOf).find((x) => x !== undefined);
if (id) {
  console.log(`Using the existing D1 database "${name}".`);
} else {
  id = idOf(await cloudflare('/d1/database', { method: 'POST', body: JSON.stringify({ name }) }));
  if (!id) throw new Error('Cloudflare did not return the new database');
  console.log(`Created the D1 database "${name}".`);
}

const config = await readFile(configPath, 'utf8');
if (!config.includes(PLACEHOLDER)) throw new Error(`${configPath} has no ${PLACEHOLDER}`);
await writeFile(configPath, config.replace(PLACEHOLDER, id));

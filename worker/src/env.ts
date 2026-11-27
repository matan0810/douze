import type { Sql } from './sql';

/** What Cloudflare hands the Worker: the variables and bindings of `wrangler.jsonc`. */
export interface Env {
  /** The origins allowed to call the API from a browser, comma separated. */
  ALLOWED_ORIGINS: string;
  /** The D1 database (`worker/migrations/`). */
  DB: Sql;
}

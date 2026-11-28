import type { Sql } from './sql';

/** What Cloudflare hands the Worker: the variables and bindings of `wrangler.jsonc`. */
export interface Env {
  /** The origins allowed to call the API from a browser, comma separated. */
  ALLOWED_ORIGINS: string;
  /** The D1 database (`worker/migrations/`). */
  DB: Sql;
  /** Google sign-in (an OAuth client of type "Web application"); both are secrets. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Google's two addresses, overridable so tests and the browser test can stand in for it. */
  GOOGLE_AUTH_URL?: string;
  GOOGLE_TOKEN_URL?: string;
}

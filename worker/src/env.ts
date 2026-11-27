/** What Cloudflare hands the Worker: the variables of `wrangler.jsonc` (and, later, bindings). */
export interface Env {
  /** The origins allowed to call the API from a browser, comma separated. */
  ALLOWED_ORIGINS: string;
}

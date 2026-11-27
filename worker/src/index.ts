import { handle } from './app';

// The main file exports only the handler: Cloudflare treats every named export of it as an
// entry point, so anything else (a constant, a helper) lives in another module.
export default { fetch: handle };

/// <reference types="vite/client" />

/** The version in package.json, injected at build time. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** The server's origin (SERVER.md); without it this build has no groups. */
  readonly VITE_API_URL?: string;
}

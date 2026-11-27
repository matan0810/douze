import { limits } from './limits';

/**
 * Douze's limits: the standard's defaults (SERVER.md), with names capped at 30 characters,
 * as the site has always capped them. The site and the Worker both read this.
 */
export const LIMITS = limits({ nameMax: 30 });

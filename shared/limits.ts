/**
 * Every limit of a project with a server, in one place (SERVER.md, "Limits"). A project
 * takes the defaults and lowers or raises what it needs with `limits({...})`; a raised one
 * needs a reason beside it. The server refuses what exceeds them, and the site reads the
 * same numbers to stop a bad entry before it is sent.
 */
export interface Limits {
  /** The largest request body, in bytes. */
  bodyBytes: number;
  /** The shortest and longest name, in characters (members, groups). */
  nameMin: number;
  nameMax: number;
  membersPerGroup: number;
  devicesPerPlayer: number;
  /** Groups one signed-in account may own. */
  groupsPerAccount: number;
  /** New groups from one internet address a day, while nobody signs in. */
  groupsPerAddressPerDay: number;
  groupsTotal: number;
  /** Writes from one device or account in a minute. */
  writesPerMinute: number;
  /** Joins, and wrong secrets, from one internet address in an hour. */
  joinsPerHour: number;
  liveConnectionsPerGroup: number;
  /** The audit log keeps this many entries per group, or this many days. */
  auditEntries: number;
  auditDays: number;
}

export const DEFAULT_LIMITS: Readonly<Limits> = {
  bodyBytes: 32 * 1024,
  nameMin: 1,
  nameMax: 40,
  membersPerGroup: 40,
  devicesPerPlayer: 5,
  groupsPerAccount: 10,
  groupsPerAddressPerDay: 5,
  groupsTotal: 2000,
  writesPerMinute: 60,
  joinsPerHour: 10,
  liveConnectionsPerGroup: 50,
  auditEntries: 1000,
  auditDays: 365,
};

/** The defaults with a project's own changes; every number must be a positive whole number. */
export function limits(changes: Partial<Limits> = {}): Readonly<Limits> {
  const merged: Limits = { ...DEFAULT_LIMITS, ...changes };
  for (const [name, value] of Object.entries(merged))
    if (!Number.isInteger(value) || value < 1)
      throw new Error(`limit ${name} must be a whole number of at least 1`);
  if (merged.nameMin > merged.nameMax) throw new Error('limit nameMin exceeds nameMax');
  return Object.freeze(merged);
}

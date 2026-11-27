import { HttpError } from './http';

/**
 * The few calls of a SQL database the Worker makes: Cloudflare's D1 has exactly this shape,
 * and the tests hand in Node's SQLite behind the same one (`worker/test/sqlite.ts`). Storage
 * sits behind this thin interface of our own (SERVER.md, part 1: lock-in).
 */
export type Value = string | number | null;

export interface Statement {
  bind(...values: Value[]): Statement;
  first(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
  run(): Promise<unknown>;
}

export interface Sql {
  prepare(query: string): Statement;
  /** Runs the statements in one transaction: all or none. */
  batch(statements: Statement[]): Promise<unknown>;
}

/** A row read back is checked like any outside data: a bad one is a server error. */
export type Row = Record<string, unknown>;

export function asRow(value: unknown): Row | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
}

export function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new HttpError(500, 'Bad stored data');
  return value;
}

export function textOrNull(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function int(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isInteger(value))
    throw new HttpError(500, 'Bad stored data');
  return value;
}

export async function first(statement: Statement): Promise<Row | undefined> {
  return asRow(await statement.first());
}

export async function all(statement: Statement): Promise<Row[]> {
  const { results } = await statement.all();
  return results.flatMap((r) => {
    const row = asRow(r);
    return row ? [row] : [];
  });
}

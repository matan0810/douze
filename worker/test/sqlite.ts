import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Sql, Statement, Value } from '../src/sql';

/**
 * Node's own SQLite behind the Worker's `Sql` interface: the same engine as D1, so the tests
 * run the real SQL and the real migrations, with nothing to install.
 */
const MIGRATIONS = new URL('../migrations/', import.meta.url);

class Prepared implements Statement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly query: string,
    private readonly values: Value[] = [],
  ) {}

  bind(...values: Value[]): Statement {
    return new Prepared(this.db, this.query, values);
  }

  private params(): SQLInputValue[] {
    return this.values;
  }

  async first(): Promise<unknown> {
    return this.db.prepare(this.query).get(...this.params()) ?? null;
  }

  async all(): Promise<{ results: unknown[] }> {
    return { results: this.db.prepare(this.query).all(...this.params()) };
  }

  async run(): Promise<unknown> {
    return this.db.prepare(this.query).run(...this.params());
  }
}

export function testDatabase(): Sql & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort())
    db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  return {
    raw: db,
    prepare: (query) => new Prepared(db, query),
    batch: async (statements) => {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl || undefined,
  max: 10,
  idleTimeoutMillis: 30_000
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string, values: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, values);
}

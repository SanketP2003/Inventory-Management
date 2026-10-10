import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');
const client = await pool.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const version = file.replace('.sql', '');
    const exists = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (!exists.rowCount) {
      await client.query('BEGIN');
      await client.query(await fs.readFile(path.join(directory, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    }
  }
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

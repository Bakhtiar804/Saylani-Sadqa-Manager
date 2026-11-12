import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('sslmode', 'verify-full');
const pool = new pg.Pool({ connectionString: url.toString(), connectionTimeoutMillis: 15000 });
try {
  await pool.query(await fs.readFile('database/migrate_box_coordinates.sql', 'utf8'));
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS registered,
    COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)::int AS located FROM donation_boxes`);
  console.log('Box coordinate migration applied. Existing records preserved.', rows[0]);
} finally { await pool.end(); }

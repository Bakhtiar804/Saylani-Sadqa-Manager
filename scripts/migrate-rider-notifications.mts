import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
try{await pool.query(await fs.readFile('database/migrate_rider_notifications.sql','utf8'));console.log('Rider task notification migration applied.');}
finally{await pool.end();}

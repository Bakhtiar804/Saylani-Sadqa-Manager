import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
try{await pool.query(await fs.readFile('database/migrate_rider_workflow_guards.sql','utf8'));console.log('Database guards installed: ordered Rider steps, counted cash and task-linked completion required.');}
finally{await pool.end();}

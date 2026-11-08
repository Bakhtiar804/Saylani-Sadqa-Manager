import "server-only";

import { Pool } from "pg";

declare global {
  var saylaniDatabasePool: Pool | undefined;
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabasePool(): Pool {
  if (globalThis.saylaniDatabasePool) {
    return globalThis.saylaniDatabasePool;
  }

  const host = requiredEnvironmentVariable("DB_HOST");
  const user = requiredEnvironmentVariable("DB_USER");
  const password = requiredEnvironmentVariable("DB_PASSWORD");
  const port = Number(process.env.DB_PORT ?? "5432");
  const database = requiredEnvironmentVariable("DB_NAME");

  if (password === "your_actual_password") {
    throw new Error("Replace the DB_PASSWORD placeholder in .env with your database password.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "saylani-sadqa-manager",
  });

  pool.on("error", (error) => {
    console.error("Unexpected error from an idle PostgreSQL connection:", error);
  });

  globalThis.saylaniDatabasePool = pool;
  return pool;
}

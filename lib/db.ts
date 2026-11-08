import "server-only";

import { Pool, type PoolConfig } from "pg";

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

function databaseConnectionConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    let url: URL;
    try {
      url = new URL(databaseUrl);
    } catch {
      throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
    }

    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname || !url.username || !url.password || url.pathname.length < 2 ||
      url.password === "replace_with_your_neon_password"
    ) {
      throw new Error("Set DATABASE_URL to the complete connection URL from the Neon Connect dialog.");
    }

    url.searchParams.set("sslmode", "verify-full");
    return {
      connectionString: url.toString(),
      enableChannelBinding: url.searchParams.get("channel_binding") !== "disable",
    };
  }

  const host = requiredEnvironmentVariable("DB_HOST");
  const user = requiredEnvironmentVariable("DB_USER");
  const password = requiredEnvironmentVariable("DB_PASSWORD");
  const port = Number(process.env.DB_PORT ?? "5432");
  const database = requiredEnvironmentVariable("DB_NAME");

  if (["your_actual_password", "replace_with_your_database_password"].includes(password)) {
    throw new Error("Replace the DB_PASSWORD placeholder with your database password.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: true },
  };
}

export function getDatabasePool(): Pool {
  if (globalThis.saylaniDatabasePool) {
    return globalThis.saylaniDatabasePool;
  }

  const pool = new Pool({
    ...databaseConnectionConfig(),
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

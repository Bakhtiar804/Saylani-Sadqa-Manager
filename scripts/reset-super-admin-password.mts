import { scrypt, randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import pg, { type PoolConfig } from "pg";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd());

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || !url.password) {
      throw new Error("DATABASE_URL is not a complete PostgreSQL URL.");
    }
    url.searchParams.set("sslmode", "verify-full");
    return {
      connectionString: url.toString(),
      enableChannelBinding: url.searchParams.get("channel_binding") !== "disable",
    };
  }

  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? "5432"),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: true },
  };
}

function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command directly in a terminal so the password can be entered privately.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write("New password (12+ characters; input hidden): ");
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Password reset cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Usage: npm run reset:super-admin-password -- superadmin@example.com");
  }

  const password = await readHiddenPassword();
  if (password.length < 12 || password.length > 1024) {
    throw new Error("Password must be between 12 and 1024 characters.");
  }

  const salt = randomBytes(16);
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
  const encodedHash = `${salt.toString("base64url")}.${key.toString("base64url")}`;

  const pool = new Pool({ ...databaseConfig(), connectionTimeoutMillis: 10_000, max: 1 });
  try {
    const result = await pool.query<{ account_status: string }>(
      `UPDATE public.users AS u
       SET password_hash = $1
       FROM public.roles AS r
       WHERE r.role_id = u.role_id
         AND r.role_key = 'super_admin'
         AND u.identity_type = 'login_account'
         AND u.deleted_at IS NULL
         AND LOWER(u.email) = $2
       RETURNING u.account_status`,
      [encodedHash, email],
    );
    if (result.rowCount !== 1) {
      throw new Error("No active Super Admin account matched that email in the app's configured database.");
    }
    console.log(result.rows[0].account_status === "active"
      ? "Password updated in the app-configured database. Sign in with the exact new password you just entered."
      : "Password updated, but the account is not active. Ask the database owner to review its account status.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Password reset failed.");
  process.exitCode = 1;
});

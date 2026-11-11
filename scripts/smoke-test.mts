import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";
import pg, { type PoolConfig } from "pg";

const roles = ["super_admin", "admin", "city_manager", "rider"] as const;
type Role = (typeof roles)[number];

type Account = {
  team_id: string;
  full_name: string;
  email: string;
  city_id: string | null;
  role_key: Role;
};

type SmokeCheck = {
  name: string;
  path: string;
  status: number;
  location?: string;
  method?: string;
  body?: Record<string, unknown>;
  cookie?: string;
  expectedCityId?: string;
};

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(projectRoot);
const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const base = new URL(baseUrl);

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const url = new URL(connectionString);
    url.searchParams.set("sslmode", "verify-full");
    return {
      connectionString: url.toString(),
      enableChannelBinding: url.searchParams.get("channel_binding") !== "disable",
    };
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

async function getRoleFixtures() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is required for role-access smoke checks.");
  const pool = new Pool({ ...databaseConfig(), connectionTimeoutMillis: 8000, max: 2 });
  try {
    const result = await pool.query<Account>(`
      SELECT DISTINCT ON (role.role_key)
        user_record.team_id, user_record.full_name, user_record.email,
        user_record.city_id, role.role_key
      FROM team_members AS user_record
      JOIN roles AS role ON role.role_id = user_record.role_id
      WHERE user_record.identity_type = 'login_account'
        AND user_record.account_status = 'active'
        AND user_record.deleted_at IS NULL
        AND role.role_key IN ('super_admin', 'admin', 'city_manager', 'rider')
        AND (role.role_key = 'super_admin' OR user_record.city_id IS NOT NULL)
        AND (role.role_key <> 'rider' OR EXISTS (
          SELECT 1 FROM riders WHERE riders.team_id = user_record.team_id
        ))
      ORDER BY role.role_key,
        EXISTS (SELECT 1 FROM collections WHERE collections.city_id = user_record.city_id) DESC,
        user_record.created_at DESC, user_record.team_id
    `);
    const accounts = new Map(result.rows.map((row) => [row.role_key, row]));
    const missing = roles.filter((role) => !accounts.has(role));
    if (missing.length) {
      console.log(`SKIP signed-in role checks; no active database fixture for: ${missing.join(", ")}.`);
      return null;
    }
    const fixtures = Object.fromEntries(accounts) as Record<Role, Account>;
    const otherCity = await pool.query<{ city_id: string }>(
      "SELECT city_id FROM cities WHERE city_id <> $1 ORDER BY city_id LIMIT 1",
      [fixtures.city_manager.city_id],
    );
    return { fixtures, secret, otherCityId: otherCity.rows[0]?.city_id ?? null };
  } finally {
    await pool.end();
  }
}

function sessionCookie(account: Account, secret: string) {
  const payload = Buffer.from(JSON.stringify({
    userId: account.team_id,
    email: account.email,
    name: account.full_name,
    role: account.role_key,
    cityId: account.city_id,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `saylani_admin_session=${payload}.${signature}`;
}

async function responds() {
  try {
    const response = await fetch(`${baseUrl}/sign-in`, { signal: AbortSignal.timeout(1200) });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function startLocalServer() {
  if (!["127.0.0.1", "localhost", "::1"].includes(base.hostname)) {
    throw new Error(`No server is responding at ${baseUrl}. Start the app first, or use a loopback URL to let this script start it.`);
  }
  if (!existsSync(resolve(projectRoot, ".next/BUILD_ID"))) {
    throw new Error("No production build was found. Run `npx next build --webpack` first.");
  }

  const child = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname",
    base.hostname === "localhost" ? "127.0.0.1" : base.hostname,
    "--port", String(base.port || 3100),
  ], { cwd: projectRoot, stdio: "ignore", env: process.env });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await responds()) return child;
    if (child.exitCode !== null) break;
    await delay(250);
  }
  child.kill("SIGTERM");
  throw new Error(`Could not start the production server at ${baseUrl}. Check the build and port, then retry.`);
}

let ownedServer: ChildProcess | null = null;
try {
  if (!await responds()) {
    console.log(`No server found at ${baseUrl}; starting the local production build for this run.`);
    ownedServer = await startLocalServer();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not prepare the smoke-test server.");
  process.exit(1);
}

const checks: SmokeCheck[] = [
  { name: "landing page", path: "/", status: 200 },
  { name: "sign-in page", path: "/sign-in", status: 200 },
  { name: "legacy login redirect", path: "/login", status: 307, location: "/sign-in" },
  { name: "public leaderboard", path: "/leaderboard", status: 200 },
  ...[
    "/dashboard", "/dashboard/admin", "/dashboard/admin/collections",
    "/dashboard/admin/boxes", "/dashboard/admin/riders", "/dashboard/admin/operations",
    "/dashboard/admin/team", "/dashboard/admins", "/dashboard/analytics",
    "/dashboard/boxes", "/dashboard/collections", "/dashboard/finance",
    "/dashboard/leaderboard", "/dashboard/operations", "/dashboard/partners",
    "/dashboard/riders", "/dashboard/users", "/dashboard/manager",
    "/dashboard/manager/collections", "/dashboard/manager/boxes",
    "/dashboard/manager/riders", "/dashboard/manager/operations",
    "/dashboard/manager/team", "/dashboard/rider", "/dashboard/rider/collections",
    "/dashboard/rider/tasks",
  ].map((path) => ({ name: `auth guard ${path}`, path, status: 307, location: "/sign-in" })),
  { name: "team accounts require sign-in", path: "/api/team-accounts", status: 403 },
  { name: "legacy Admin API requires sign-in", path: "/api/admins", status: 403, method: "POST", body: {} },
  { name: "collections API requires sign-in", path: "/api/dashboard/collections", status: 401 },
  { name: "field logs API requires sign-in", path: "/api/dashboard/collections/field-logs", status: 401 },
  { name: "city collections API requires sign-in", path: "/api/dashboard/admin/collections", status: 401 },
  { name: "city field logs API requires sign-in", path: "/api/dashboard/admin/collections/field-logs", status: 401 },
  { name: "database health", path: "/api/health/database", status: 200 },
  {
    name: "unknown account is safely rejected",
    path: "/api/auth/login",
    status: 401,
    method: "POST",
    body: { email: "e2e-missing-account@example.invalid", password: "invalid-probe" },
  },
  { name: "logout clears session and redirects", path: "/api/auth/logout", status: 303, method: "POST", location: "/sign-in" },
];

let roleFixtures: Awaited<ReturnType<typeof getRoleFixtures>> = null;
if (["127.0.0.1", "localhost", "::1"].includes(base.hostname)) {
  try {
    roleFixtures = await getRoleFixtures();
  } catch (error) {
    console.log(`SKIP signed-in role checks: ${errorCode(error) ?? (error instanceof Error ? error.message : String(error))}`);
  }
} else {
  console.log("SKIP signed-in role checks for non-local URLs to avoid sending test sessions off-device.");
}

if (roleFixtures) {
  const { fixtures, secret, otherCityId } = roleFixtures;
  const roleRouteChecks = [
    ["super_admin", "/dashboard", 200],
    ["super_admin", "/dashboard/admins", 200],
    ["super_admin", "/dashboard/analytics", 200],
    ["super_admin", "/dashboard/boxes", 200],
    ["super_admin", "/dashboard/collections", 200],
    ["super_admin", "/dashboard/finance", 200],
    ["super_admin", "/dashboard/leaderboard", 200],
    ["super_admin", "/dashboard/operations", 200],
    ["super_admin", "/dashboard/partners", 200],
    ["super_admin", "/dashboard/riders", 200],
    ["super_admin", "/dashboard/users", 200],
    ["admin", "/dashboard/admin", 200],
    ["admin", "/dashboard/admin/team", 200],
    ["admin", "/dashboard/admin/boxes", 200],
    ["admin", "/dashboard/admin/collections", 200],
    ["admin", "/dashboard/admin/riders", 200],
    ["admin", "/dashboard/admin/operations", 200],
    ["manager", "/dashboard/manager", 200],
    ["manager", "/dashboard/manager/team", 200],
    ["manager", "/dashboard/manager/boxes", 200],
    ["manager", "/dashboard/manager/collections", 200],
    ["manager", "/dashboard/manager/riders", 200],
    ["manager", "/dashboard/manager/operations", 200],
    ["rider", "/dashboard/rider", 200],
    ["rider", "/dashboard/rider/collections", 200],
    ["rider", "/dashboard/rider/tasks", 200],
  ] as const;
  for (const [role, path, status] of roleRouteChecks) {
    const fixtureRole = role === "manager" ? "city_manager" : role;
    checks.push({
      name: `${fixtureRole} dashboard ${path}`,
      path,
      status,
      cookie: sessionCookie(fixtures[fixtureRole], secret),
    });
  }

  const redirectChecks = [
    ["admin", "/dashboard/users", "/dashboard/admin"],
    ["city_manager", "/dashboard/admin/team", "/dashboard/manager"],
    ["rider", "/dashboard/admins", "/dashboard/rider"],
  ] as const;
  for (const [role, path, location] of redirectChecks) {
    checks.push({
      name: `${role} restricted page ${path}`,
      path,
      status: 307,
      location,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }

  for (const role of ["super_admin", "admin", "city_manager"] as const) {
    checks.push({
      name: `${role} can view eligible team accounts`,
      path: "/api/team-accounts",
      status: 200,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  checks.push({
    name: "rider cannot use team account API",
    path: "/api/team-accounts",
    status: 403,
    cookie: sessionCookie(fixtures.rider, secret),
  });

  for (const role of ["super_admin", "city_manager"] as const) {
    checks.push({
      name: `${role} generic collections API access`,
      path: "/api/dashboard/collections",
      status: 200,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["admin", "rider"] as const) {
    checks.push({
      name: `${role} blocked from generic collections API`,
      path: "/api/dashboard/collections",
      status: 403,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["super_admin", "city_manager"] as const) {
    checks.push({
      name: `${role} generic field-log API access`,
      path: "/api/dashboard/collections/field-logs",
      status: 200,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["admin", "rider"] as const) {
    checks.push({
      name: `${role} blocked from generic field-log API`,
      path: "/api/dashboard/collections/field-logs",
      status: 403,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["admin", "city_manager"] as const) {
    checks.push({
      name: `${role} city-scoped collections API access`,
      path: "/api/dashboard/admin/collections",
      status: 200,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["admin", "city_manager"] as const) {
    checks.push({
      name: `${role} city-scoped field-log API access`,
      path: "/api/dashboard/admin/collections/field-logs",
      status: 200,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  if (otherCityId && fixtures.city_manager.city_id) {
    checks.push({
      name: "city manager cannot widen collection reads by requesting another city",
      path: `/api/dashboard/collections?city=${encodeURIComponent(otherCityId)}`,
      status: 200,
      cookie: sessionCookie(fixtures.city_manager, secret),
      expectedCityId: fixtures.city_manager.city_id,
    });
    checks.push({
      name: "city manager city endpoint ignores requested alternate city",
      path: `/api/dashboard/admin/collections?city=${encodeURIComponent(otherCityId)}`,
      status: 200,
      cookie: sessionCookie(fixtures.city_manager, secret),
      expectedCityId: fixtures.city_manager.city_id,
    });
  }
  for (const role of ["super_admin", "rider"] as const) {
    checks.push({
      name: `${role} blocked from city-scoped collections API`,
      path: "/api/dashboard/admin/collections",
      status: 403,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  for (const role of ["super_admin", "rider"] as const) {
    checks.push({
      name: `${role} blocked from city-scoped field-log API`,
      path: "/api/dashboard/admin/collections/field-logs",
      status: 403,
      cookie: sessionCookie(fixtures[role], secret),
    });
  }

  for (const role of roles) {
    checks.push({
      name: `${role} cannot delete own account through team API`,
      path: "/api/team-accounts",
      status: 403,
      method: "DELETE",
      body: { userId: fixtures[role].team_id, confirmedEmail: fixtures[role].email },
      cookie: sessionCookie(fixtures[role], secret),
    });
  }

  for (const role of ["admin", "city_manager"] as const) {
    checks.push({
      name: `${role} cannot create a ${role}`,
      path: "/api/team-accounts",
      status: 403,
      method: "POST",
      body: {
        name: "Role Access Probe",
        phone: "+923001234567",
        email: `role-access-${role}@example.invalid`,
        password: "not-a-real-account-password",
        role,
        cityId: fixtures[role].city_id,
      },
      cookie: sessionCookie(fixtures[role], secret),
    });
  }
  checks.push({
    name: "rider cannot create a team account",
    path: "/api/team-accounts",
    status: 403,
    method: "POST",
    body: {
      name: "Role Access Probe",
      phone: "+923001234567",
      email: "role-access-rider@example.invalid",
      password: "not-a-real-account-password",
      role: "rider",
      cityId: fixtures.rider.city_id,
    },
    cookie: sessionCookie(fixtures.rider, secret),
  });
}

let failures = 0;
for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method ?? "GET",
      redirect: "manual",
      headers: {
        ...(check.body ? { "Content-Type": "application/json" } : {}),
        ...(check.cookie ? { Cookie: check.cookie } : {}),
      },
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    const location = response.headers.get("location");
    const locationPath = location ? new URL(location, baseUrl).pathname : null;
    let bodyCheckPassed = true;
    if (check.expectedCityId && response.ok) {
      const body = await response.json();
      bodyCheckPassed = Array.isArray(body.records) && body.records.length > 0 &&
        body.records.every((record: { city_id: string }) => record.city_id === check.expectedCityId);
    }
    const passed = response.status === check.status && (!check.location || locationPath === check.location) && bodyCheckPassed;
    console.log(`${passed ? "PASS" : "FAIL"} ${check.name}: HTTP ${response.status}${locationPath ? ` -> ${locationPath}` : ""}`);
    if (!passed) failures += 1;
  } catch (error) {
    const message = error instanceof Error ? errorCode(error.cause) ?? error.message : String(error);
    console.log(`FAIL ${check.name}: ${message}`);
    failures += 1;
  }
}

console.log(`\n${checks.length - failures}/${checks.length} smoke checks passed.`);
if (ownedServer) {
  const server = ownedServer;
  ownedServer.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => server.once("exit", resolveExit)), delay(3000)]);
  if (ownedServer.exitCode === null) ownedServer.kill("SIGKILL");
}
if (failures) process.exitCode = 1;

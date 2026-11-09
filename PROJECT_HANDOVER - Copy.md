# Project Handover: Saylani Sadqa Manager

Prepared 2026-11-09 from the checked-out repository, current Git state, local project documentation, and implementation history in this Codex conversation. This document intentionally contains no passwords, tokens, database URLs, or secret values.

## 1. Project overview and requirements

Saylani Sadqa Manager is a web dashboard and public-facing site for fictional/demo management of donation boxes and related field operations. It is intended to track box locations and status, donations/collections, riders and tasks, partners, cash handover/deposits, inspections, security incidents, operating costs, and reports.

Requirements gathered from the project history and code:

- Validate sign-in against PostgreSQL login-account records, not environment-file login credentials.
- Support four application roles: Super Admin, Admin, City Manager, and Rider.
- Preserve operational people who appear in mock records but do not have login accounts.
- Retrieve dashboard operational data from PostgreSQL; keep research/KPI documentation as source files.
- Show loading skeletons and a navigation progress indicator while dashboard routes/data load.
- Keep record browsing responsive; collection registers use server-side paging rather than shipping the entire collection table to the browser.
- Provide an Admin dashboard. The current Admin page is scoped to the signed-in account's assigned city and is an MVP overview.
- Clearly mark synthetic records as demo data; no figure should be represented as live financial reporting.

There is an existing Super Admin Admin Management feature in the repository. It creates Admin accounts in PostgreSQL. The recent Admin Dashboard work did not add account creation or change the database.

## 2. Technology stack

Versions pinned/resolved by the checked-in manifests at handover:

- Next.js `16.4.5`, App Router, Cache Components, Partial Prefetching, and the Next.js 16 `proxy.ts` convention.
- React and React DOM `19.3.0`.
- TypeScript (`^5`), strict mode enabled.
- PostgreSQL via `pg` (`^8.23.1`), normally Neon in the documented setup.
- Tailwind CSS 4 (`^4.3.5`) with `@tailwindcss/postcss` and `@tailwindcss/turbopack`.
- Recharts `^3.10.1` for charts.
- Radix Slot, class-variance-authority, clsx, tailwind-merge, and `server-only` for UI/utilities and server-only protection.
- ESLint 9 and `eslint-config-next` 16.4.5.
- Package manager: npm. Versions in this environment when inspected: Node `v26.8.1`, npm `11.19.0`.

The scripts in `package.json` include `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run test:smoke`, and `npm run reset:super-admin-password`.

## 3. Architecture and folder structure

```text
app/
  page.tsx                         Marketing/landing page
  sign-in/                         DB-backed sign-in UI
  login/                           Legacy login route (inspect before removing)
  api/auth/                        Login and logout handlers
  api/admins/                      Super Admin-only Admin account creation
  api/dashboard/collections/       Authenticated paginated collection APIs
  api/health/database/             Database health check
  dashboard/                       Protected dashboard shell and modules
    admin/                         Assigned-city Admin overview (new MVP)
    admins/                        Super Admin Admin Management
    analytics/, boxes/, collections/, finance/, leaderboard/,
    operations/, partners/, riders/, users/
  leaderboard/                     Public partner leaderboard
components/
  dashboard/                       Shell, charts, tables, loading and navigation
  landing/                          Landing page sections
  ui/                               Shared UI primitives
data/                               Mock/source records and KPI/research docs
database/                           PostgreSQL schema, seed, migration, guide
lib/                                DB access, auth/session, data queries, analytics
public/                             Static images and Next starter assets
styles/                             Theme styles
proxy.ts                            Session/role route gate for /dashboard/*
```

Key request/data flow:

1. `app/sign-in/sign-in-form.tsx` posts email/password to `/api/auth/login`.
2. The login handler looks up an active normalized login account in `users` joined to `roles`, checks the scrypt hash, and issues a signed eight-hour HTTP-only session cookie.
3. `proxy.ts` validates the signed session for dashboard routes. `app/dashboard/layout.tsx` validates again before rendering the shell.
4. Server pages call server-only PostgreSQL helpers in `lib/dashboard-data.ts`.
5. Large collection and field-log registers start with 10 rows and fetch later pages/filters from authenticated APIs.

## 4. Completed implementation (verified in source)

### Authentication and roles

- Login lookup is against PostgreSQL `users`/`roles`, with account status and role read from the DB (`lib/admin-accounts.ts`).
- Password hashing/verification uses Node crypto scrypt (`lib/auth.ts`). Missing accounts still run a dummy hash verification before returning the generic invalid-credentials response.
- Sessions are HMAC-signed and include user ID, email, name, role, city ID, and expiry (`lib/session.ts`). Cookie is HTTP-only, SameSite Lax, eight hours, and Secure in production.
- Dashboard session checks exist in Proxy and the dashboard layout.
- Team-account creation is role-scoped through `GET/POST /api/team-accounts`: Super Admin can create Admin/City Manager/Rider; Admin can create City Manager/Rider in the Admin's assigned city; City Manager can create Riders in the Manager's assigned city. The form collects name, phone, email, login status, and password; Super Admin selects city, while Admin/Manager use their session city. Rider creation additionally collects employment status and assigned zone, then inserts both the `users` login row and linked `riders` profile in one PostgreSQL transaction.
- Team-account deletion is role-scoped through `DELETE /api/team-accounts`: Super Admin can remove Admin/City Manager/Rider accounts, Admin can remove City Manager/Rider accounts in their city, and City Manager can remove Riders in their city. The UI requires two confirmations (review, then type the account email); Super Admin accounts are not deletable through this feature. Deletion is a transactional soft delete (`users.account_status='inactive'`, `users.deleted_at` set; Rider employment is set inactive), so foreign-key-linked collections and audit history remain intact. Deleted logins are rejected and deleted accounts are omitted from active Team Accounts.
- Login response routes Admin to `/dashboard/admin`, City Manager to `/dashboard/manager`, and Rider to `/dashboard/rider`; Super Admin goes to `/dashboard`.
- Admin and City Manager page routes are redirected to their dedicated dashboard areas. Their dashboard record pages use the signed-in account's city; collection and field-log APIs constrain those roles to the session city. Rider pages use the session user ID to load that account's rider profile and records.

### Admin dashboard MVP

`app/dashboard/admin/page.tsx` verifies the session is Admin, uses the session city ID in `getOverviewData`, and renders an assigned-city overview:

- Verified collection total and record count for selected date range.
- Pending plus flagged collection review count.
- Donation box total/active/attention counts.
- Rider task completion percentage/count.
- Daily collection trend and collection status chart.
- Needs-attention queue, quick in-page jumps, recent operations activity, and the recent collection records returned by the overview query.
- If an Admin account has no city assignment, the page shows a city-assignment message instead of network-wide metrics.

The Admin sidebar includes Overview, Collections, Donation Boxes, Riders & Tasks, Field Operations, and Team Accounts. Operational registers are read-only and city-scoped. Team Accounts creates City Manager and Rider accounts in the Admin's assigned city.

### City Manager dashboard MVP

`app/dashboard/manager/` provides an assigned-city overview and sidebar links for Collections, Donation Boxes, Riders & Tasks, Field Operations, and Team Accounts. Operational register pages reuse the existing city-scoped read-only Admin views. City Managers can create Rider accounts only, assigned to their own city. The root `/dashboard` and sign-in flow route City Managers to `/dashboard/manager`.

### Rider dashboard MVP

`app/dashboard/rider/` provides a personal overview, task register, and collection/field-log registers. `lib/rider-dashboard.ts` links the authenticated session's `userId` to `riders.user_id`, then filters each query by that rider's `rider_id`. The dashboard is read-only; task updates and collection entry are not implemented. Rider sessions are routed to this workspace and blocked from the generic collection APIs.

### DB schema and mock data

The checked-in SQL models these 14 operational/auth tables: `cities`, `roles`, `users`, `partners`, `riders`, `donation_boxes`, `collections`, `rider_tasks`, `field_collection_logs`, `cash_handover_deposits`, `box_inspections`, `box_status_history`, `security_incidents`, and `operational_costs`.

- `roles` holds four definitions; `users` holds login accounts and referenced field/partner identities.
- Login records have a role and password hash. Field staff/partner identities have neither.
- Rider-specific properties are in `riders`; general identity is in `users`.
- SQL deliverables are `database/schema.sql`, `database/seed_demo.sql`, and `database/migrate_app_admins.sql`.
- The migration copies legacy `app_admins` accounts into `users` and intentionally retains the source table.
- `database/README.md` documents intended seed counts and the local demo-login material. Do not copy its credential values into this handover or production configuration.
- SQL seed/migration scripts are additive. `ON CONFLICT DO NOTHING` means reruns do not necessarily update existing rows to match changed source data.

### Data retrieval, performance, and loading UI

- `lib/db.ts` creates a server-only PostgreSQL pool. `DATABASE_URL` takes precedence over legacy split DB variables. Pool maximum was raised to 10.
- `getDashboardRecords(keys)` reads only requested datasets; `getAllRecords()` remains for cross-module analytics.
- `getOverviewData()` uses SQL aggregates and a short Next cache, rather than downloading all operational rows for the main overview.
- Dashboard data cache uses tag `dashboard-db-records` and short revalidation; team-account creation invalidates that tag.
- Collection and field-collection explorers have server-side paging/filter/sort APIs. Initial page data contains 10 rows per register.
- Skeletons are in `components/dashboard/dashboard-skeleton.tsx`, `app/dashboard/loading.tsx`, and `app/leaderboard/loading.tsx`.
- `components/dashboard/navigation-progress.tsx` listens for navigation and custom data start/ready events. `PageHeading` adds the `data-dashboard-ready` marker used to finish route progress.
- DB-backed pages call Next's `connection()` before request-time database queries to avoid build-time DB prerender access.
- KPI definitions, proposed field dictionary, and research assumptions on Analytics are local documentation under `data/`, not database records.

### Dashboard pages

The source has screens for general overview, Admin overview, Admin Management, analytics, boxes, collections, finance, internal partner leaderboard, operations, partners, riders/tasks, and users, plus a public partner leaderboard. Most operational pages use normalized PostgreSQL records. The public leaderboard is intentionally unauthenticated and labeled fictional demo data.

## 5. Current development status

- Current branch: `admin`.
- Current HEAD: `144a804` (`flow is working`), dated 2026-11-08.
- The current working tree contains extensive uncommitted changes from DB normalization, auth conversion, dashboard DB reads/performance, loading UI, and Admin Dashboard work. These changes have not been committed in the repository history.
- The current worktree also includes the Admin city-scoped read-only modules, role-based Team Accounts creation, City Manager dashboard MVP, and Rider dashboard MVP.
- The current worktree also includes role-scoped, double-confirmed team-account soft deletion. The migration has been applied and verified against the database configured for this workspace after sign-in exposed the missing `users.deleted_at` column.
- Added `scripts/smoke-test.mjs` for no-credential HTTP checks and `scripts/reset-super-admin-password.mjs` for private local Super Admin password resets against the app-configured database.
- Current verification: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, and `git diff --check` passed. The production-build smoke suite passed 79 checks, including public pages, sign-in guards, all four role dashboards/APIs, collection and field-log permissions, city-scope enforcement, team-role denial cases, DB health, invalid login, and logout.
- The `/dashboard` current-time prerender warning was fixed by deferring the session check with `connection()` inside a Suspense boundary. The 79-check role-aware smoke suite passed against both the production build and the running development server; the development log has no new current-time diagnostics after the fix.
- A configured-database read-only schema audit found all 14 expected tables, all four role definitions, and all ten required account columns. The account deletion migration was applied and verified on this configured database.
- Signed-in role routes and read-only APIs were smoke-tested with locally generated HMAC sessions based on active database role rows. Password-success login and mutating account creation/deletion workflows were not tested; those require a private credential/test fixture and writes. See the smoke-suite limits in `README.md`.
- Default `npm run build` (Turbopack) panicked in this restricted environment while trying to create a process/bind a port; the same project built successfully through Webpack. Treat the Turbopack result as an environment/tooling warning, not proof that the application code fails.
- No database scripts were run as part of the latest Admin Dashboard change. In an earlier project turn, read-only queries verified the demo table counts and dashboard query results; these are historical checks and were not repeated while preparing this document.
- No known qualifying Next.js feedback draft was opened; browser automation timed out/unavailable during the preceding implementation.

## 6. Pending tasks and roadmap

Prioritize in this order:

1. **Complete authorization for every role.** Admin, City Manager, and Rider now have dedicated dashboard areas. The full page/API access matrix remains unaudited, especially for legacy APIs and all Super Admin/City Manager privileges. Hiding links is not access control; audit all page and API handlers.
2. **Finish Admin operational workflows.** Admin currently sees an overview and at most the recent records returned by `getOverviewData` (8). The quick actions are in-page anchors; they do not provide full record verification, edits, assignment, or reconciliation workflows. Decide which modules Admin may use and implement server-side city scoping for every route/API before exposing those modules.
3. **City-scoped Admin account provisioning.** The current Team Accounts screen requires a city when Super Admin creates an Admin. Older migrated Admins may still have null city and need assignment through a future edit flow.
4. **Role policy and data boundaries.** The schema has no `permissions`/`role_permissions` tables and the code uses explicit role checks. Document who can read, create, update, verify, reconcile, and administer each entity.
5. **Audit DB/schema quality and empty fields.** Project history explicitly postponed reviewing empty columns. Do this only after understanding seed semantics and whether the fields are intentionally historical/snapshot data.
6. **Migration/reseed operability.** Document safe backup, dry-run/count checks, and duplicate handling before production. Current seed conflict strategy is insert-only and may preserve stale data.
7. **Expand repeatable acceptance tests.** `npm run test:smoke` covers public routes, signed-in role access, and city isolation. Add isolated fixtures or a dedicated test database before automating successful password login, pagination/filter correctness, account creation, and soft deletion.
8. **Review production readiness.** Remove/localize demo credentials, check secure environment configuration and cookie settings, review rate limiting/CSRF strategy, logging, database pool settings, and synthetic-data labels.
9. **Review public leaderboard publication policy.** It currently reads database demo/operational records without authentication. Confirm that only approved public aggregates may be exposed when using non-demo data.

## 7. Important technical decisions and caveats

- A `users` table is necessary for person/account identity; `roles` contains definitions, not user accounts. One role per login account is represented by `users.role_id`.
- `identity_type` distinguishes `login_account`, `field_staff`, and `partner_identity`; the latter two have no role/password but are retained because operational rows reference them.
- City assignment lives on `users.city_id`. Admin and City Manager dashboard pages scope displayed operational records to the session city; their collection APIs use the session city instead of accepting a requested city. Do not assume this policy is applied to all routes or APIs.
- Role definitions currently are `super_admin`, `admin`, `city_manager`, and `rider`. Login routes Admin, City Manager, and Rider to dedicated areas; Super Admin goes to `/dashboard`.
- Admin user creation invalidates the dashboard cache. Other future mutation routes must invalidate `dashboard-db-records` when relevant.
- Account removal is intentionally a soft delete because operational/audit tables reference `users`; the deletion migration adds nullable `users.deleted_at`. The configured workspace database now has this column; apply `database/migrate_team_account_deletion.sql` to any other database before using the feature there.
- `connection()` is required in DB-backed pages with this Next.js configuration to keep live DB queries out of build prerendering.
- Search/filter fields passed to SQL must remain parameterized. Do not concatenate user input into SQL.
- Collections and field visit logs are distinct registers; their mock rows should not be merged just because their fields overlap.
- Historical handover-reference strings in mock data did not match `handover_id`, so they remain text references per the earlier plan.
- “Empty” values and KPI/research source files were intentionally left for a later review.

## 8. Setup and environment variables

1. Use the repository's package manager: `npm install`.
2. Create `.env.local` from `.env.example`; never commit `.env.local`.
3. Set a PostgreSQL connection using either `DATABASE_URL` or the legacy split variables. The documented Neon setup uses a pooled URL with TLS. If both approaches are populated, `DATABASE_URL` takes precedence.
4. Set a unique random `AUTH_SECRET` for HMAC session signing. Do not reuse a sample value.
5. Apply `database/schema.sql`, then `database/seed_demo.sql`, then (if the legacy table exists and needs migration) `database/migrate_app_admins.sql` against a development database. Back up and inspect the target before applying SQL; do not assume these scripts are appropriate for production.
6. Start with `npm run dev`. Health check: `/api/health/database`.

Environment variable names referenced by source/docs:

- `DATABASE_URL` — PostgreSQL connection string; preferred.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — legacy split connection settings; default port is 5432.
- `AUTH_SECRET` — required for signed session cookies.
- `NODE_ENV` — controls the Secure cookie option in production.
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH` — legacy names still shown in `.env.example`; current DB-backed sign-in ignores them. Do not treat them as active login configuration.

Never paste secret values into issues, handover documents, logs, or agent prompts. The repository's database guide contains local-only demo credentials; handle that file accordingly and do not use them in production.

## 9. Git branches, commits, and uncommitted changes

At inspection, `git status --short` showed the following tracked modifications:

```text
.env.example, README.md
app/api/admins/route.ts, app/api/auth/login/route.ts
app/dashboard/admins/page.tsx, app/dashboard/analytics/page.tsx
app/dashboard/boxes/page.tsx, app/dashboard/collections/page.tsx
app/dashboard/finance/page.tsx, app/dashboard/layout.tsx
app/dashboard/leaderboard/page.tsx, app/dashboard/operations/page.tsx
app/dashboard/page.tsx, app/dashboard/partners/page.tsx
app/dashboard/riders/page.tsx, app/dashboard/users/page.tsx
app/leaderboard/page.tsx, app/sign-in/sign-in-form.tsx
components/dashboard/admin-management.tsx, components/dashboard/admin-shell.tsx
components/dashboard/navigation.ts, components/dashboard/page-heading.tsx
components/dashboard/record-explorer.tsx, components/dashboard/sidebar.tsx
components/dashboard/topbar.tsx
lib/admin-accounts.ts, lib/auth.ts, lib/dashboard-data.ts
lib/db.ts, lib/partner-leaderboard.ts, lib/session.ts
next.config.ts, proxy.ts
```

Untracked at inspection:

```text
app/api/dashboard/collections/route.ts
app/api/dashboard/collections/field-logs/route.ts
app/dashboard/admin/page.tsx
app/dashboard/loading.tsx, app/leaderboard/loading.tsx
components/dashboard/dashboard-skeleton.tsx
components/dashboard/navigation-progress.tsx
database/README.md, database/migrate_app_admins.sql
database/schema.sql, database/seed_demo.sql
```

The active local branch `admin` pointed to `144a804` and tracked `origin/admin`. At the time of inspection, `origin/admin`, `origin/manager`, `origin/main`, and `origin/HEAD` referred to the same HEAD commit. Other remote refs included `origin/auth`, `origin/dashboard-S-Admin`, `origin/landing`, and `origin/DB-Connection-UnSolved`.

Recent history before the uncommitted work includes `144a804 flow is working`, `ec6446b Merge dashboard-S-Admin into auth`, `302784d Merge DB updates into auth`, `35b4c6b Fix Neon PostgreSQL connection setup`, `3ac756b Unresolved DB error`, and `76bed63 feat: Sign-in Added`.

**Critical:** do not reset, checkout over, clean, or discard the current worktree. Review the staged/unstaged/untracked diffs first; these changes were intentionally left uncommitted for continuation.

## 10. Known bugs, warnings, and unknowns

- **Authorization is incomplete:** Admin, City Manager, and Rider now have dedicated areas, but the full per-role route/API policy has not been audited. Audit page and API access before deployment.
- **Rider dashboard is read-only:** Riders can view their assigned tasks and linked collections/field logs. They cannot update task status or submit collection records.
- **Team account creation is implemented but not live-DB verified in this turn:** the API applies the role matrix and city scope, stores phone/account status and scrypt password hashes, and creates Rider employment status/zone transactionally. Confirm against the intended development database before relying on created accounts.
- **Operational workflows are read-only:** Admin and City Manager can inspect city-scoped collection, box, rider/task, and field-operation records; verification, edits, assignment, and reconciliation are not implemented in these modules.
- **Null Admin city:** An Admin with `city_id IS NULL` is shown an assignment prompt. Existing legacy migration sets city to null, so a migrated Admin will need city assignment (and a fresh sign-in) before metrics appear.
- **Legacy environment variables:** `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD_HASH` remain in `.env.example`, but the current sign-in code uses database accounts. Their presence can mislead operators.
- **Turbopack build warning:** In this environment, default `next build` panicked with an OS permission error around creating a process/binding a port while processing CSS/server chunks. `npx next build --webpack` succeeded. Recheck in the next agent's environment before deciding it is a project defect.
- **Demo credential material:** `database/README.md` has a local demo password and emails. Never repeat those values in handover/output or production; consider moving local-only credential instructions to a safer developer-only location.
- **Historical data/runtime mismatch:** a prior DB read during this project found records dated later than the then-current date. That was not rechecked during handover; inspect the live DB and demo date-generation assumptions if date filtering appears odd.
- **Database counts not re-audited:** this turn verified schema objects/columns but did not count operational records. Earlier counts are historical only and may have changed.
- **Test coverage remains partial:** role-based dashboards and read-only APIs pass signed-session smoke checks, but successful password login and account mutations are not automated. No test database fixtures are configured.
- **Additional unknowns:** deployed environment/provider, production DB contents, whether legacy `app_admins` still exists, whether SQL migration/seed have been applied to the current DB, and whether any current local `.env.local` settings are valid. Secret files were not inspected.

## 11. Instructions for the next AI coding agent

1. Read `AGENTS.md` first. This repository explicitly says this Next.js version differs from prior conventions; read the relevant guides under `node_modules/next/dist/docs/` before changing routing, caching, loading, Proxy, or server data access. The file also enables Next.js agent feedback handling.
2. Start with `git status --short`, `git diff --stat`, and review the existing uncommitted changes. Do not overwrite or discard work; the current worktree is the project state being handed over.
3. Do not read or print `.env.local` or any credential-bearing file. Refer only to variable names in this document. Do not copy demo credentials from the database README.
4. Before data/schema changes, inspect `database/schema.sql`, the seed, migration, and source mock files. Confirm the intended DB/environment with the user if the target is ambiguous; never run destructive SQL or seed production.
5. Keep database access in server-only modules, use parameterized SQL, and preserve role checks in both UI routing and API handlers. UI-hidden links do not enforce authorization.
6. Treat the current Admin city scope as a partial policy, not a system-wide guarantee. If expanding Admin pages, filter every query/API by the authenticated `city_id`, and decide explicitly how unassigned accounts behave.
7. Verify login role redirect, Admin no-city handling, Super Admin overview, direct-route authorization, collection paging/filtering, and demo labels after role changes. Check login/session behavior after changing a user's DB role/city; the signed cookie can retain old values until sign-out/expiry.
8. Current successful build path was Webpack (`npx next build --webpack`). Default Turbopack build encountered a sandbox process-binding panic; reproduce outside the restricted environment before changing bundler config.
9. The no-credential HTTP smoke suite is `npm run test:smoke`; it does not validate authenticated account creation/deletion or every role's in-session behavior.
10. Update this handover when material architecture, role policy, environment requirements, or migration status changes. Commit only when asked or when the user explicitly requests it; no current uncommitted change should be silently committed or discarded.

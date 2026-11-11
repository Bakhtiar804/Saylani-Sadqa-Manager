# Saylani Sadqa Manager

**Current data mode:** the main dashboards now use the supplied real monthly
donation and expense workbook. Read [REAL_DATA.md](REAL_DATA.md) for its meaning,
source reconciliation, safe import commands, city scoping and operational routes.
Older demo setup and historical limits below do not describe the current reporting views.

This app helps a team manage donation boxes, collections, riders, partners, cash handovers, inspections, and incidents. The included sample data is for development only. It is not live financial information.

## What you need

- Node.js 20.9 or newer
- npm
- A PostgreSQL database (Neon is supported)

Check your versions:

```bash
node --version
npm --version
```

## Run the app on your computer

1. Open Terminal in the project folder.
2. Install the project packages:

   ```bash
   npm install
   ```

3. Make a local settings file:

   ```bash
   cp .env.example .env.local
   ```

4. Open `.env.local`. Set `DATABASE_URL` to your PostgreSQL connection URL. Set `AUTH_SECRET` to a long random value. On Mac, you can make one with:

   ```bash
   openssl rand -base64 32
   ```

   Copy the generated value into `AUTH_SECRET`. Keep `.env.local` private. Do not commit it or send its values in chat.

5. Set up a **development** database as described below.
6. Start the app:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

The database check is at [http://localhost:3000/api/health/database](http://localhost:3000/api/health/database). It should return `{"status":"connected"}`.

## Set up the database

In Neon, create or choose a development branch, then copy its connection URL into `.env.local`. Check the selected project, branch, and database before running SQL.

For a new development database, use Neon’s SQL Editor and run these files in order:

1. `database/schema.sql`
2. `database/seed_demo.sql`

Only if you are moving old accounts from an existing `app_admins` table, also run `database/migrate_app_admins.sql`.

For an older database that does not have `users.deleted_at`, run `database/migrate_team_account_deletion.sql`. A new database created from the current schema already has this column.

For an existing database, run `database/migrate_activity_audit_log.sql` before using rider task updates, collection submission, or collection review.

**Do not run the demo seed on production data.** The seed adds sample records and does not update records that already exist.

The demo sign-in accounts and their local-only password are documented in [database/README.md](database/README.md). Use them only in a development database.

## Roles and account management

- **Super Admin** uses `/dashboard`. It can create City Admin, Branch Admin, and Rider accounts, and remove those roles.
- **City Admin** uses `/dashboard/admin`. It can create or remove Branch Admin and Rider accounts in its assigned city.
- **Branch Admin** uses `/dashboard/manager`. It can create or remove Rider accounts in its assigned city.
- **Rider** uses `/dashboard/rider` and sees their own tasks and records.

Removing a team account takes two confirmations. It disables sign-in and keeps old collection and audit records. Super Admin accounts cannot be removed from Team Accounts. There is no dashboard option to create another Super Admin; an authorized owner must provision one through the database.

To reset an existing Super Admin password, run this in the project Terminal:

```bash
npm run reset:super-admin-password -- superadmin@example.com
```

Type a new password when prompted. The input stays hidden. The script updates the matching Super Admin in the same database the app uses. Sign in with the new password, not the generated hash.

## Check the project

Run lint and TypeScript checks:

```bash
npm run lint
npx tsc --noEmit
```

Build the production app:

```bash
npx next build --webpack
```

Run the smoke checks after a successful build:

```bash
npm run test:smoke -- http://127.0.0.1:3100
```

The smoke command starts and stops the local production app itself. It checks public pages, dashboard access rules for all four roles found in the database, collection and field-log API permissions, city limits, database health, invalid sign-in, and logout. It does not create or delete accounts. It does not test a successful password sign-in or account changes.

## Current limits

- City Admin and Branch Admin operations are view-only. Editing, assigning, verifying, and reconciling operational records are not implemented yet.
- Riders can view their tasks and records but cannot update tasks or submit collections.
- Successful password sign-in and account create/delete need a separate acceptance test with safe test accounts.
- The public leaderboard is open to visitors. Review it before using real organization data.

## What Git should ignore

`.gitignore` excludes local secrets such as `.env.local`, dependency folders, build output, test reports, logs, local database files/backups, and operating-system/editor files. `.env.example` stays in Git because it contains placeholders, not real credentials. Keep source files such as SQL schemas and migrations tracked.

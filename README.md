# Saylani Sadqa Manager

## Run locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Neon PostgreSQL connection

1. In the Neon project dashboard, open **Connect** and select your branch,
   database, and role. Enable **Connection pooling** and copy the PostgreSQL URL.
2. Create `.env.local` in the project root using `.env.example` as a template.
   Set `DATABASE_URL` to the full URL from Neon and restart the dev server.

The connection is server-only and uses TLS with certificate and hostname
verification. Git ignores `.env.local`. Keep the URL private because it contains
the database password.

Existing setups can still use `DB_HOST`, `DB_PORT` (default `5432`), `DB_NAME`,
`DB_USER`, and `DB_PASSWORD` when `DATABASE_URL` is unset. If both are configured,
the URL takes precedence.

Start the app and request
[http://localhost:3000/api/health/database](http://localhost:3000/api/health/database).
A successful connection returns `{"status":"connected"}`. On HTTP 503, check
the terminal running Next.js for the connection error.

Use `getDatabasePool()` from `lib/db.ts` in server-only code for application
queries. Pass user-provided values as query parameters (for example,
`pool.query("SELECT ... WHERE id = $1", [id])`), never by concatenating them
into SQL.

## Super-admin sign-in

Configure `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH` (a salted scrypt
hash), and a unique, random `AUTH_SECRET` in `.env.local` or your hosting
provider's secret manager. Never commit credentials or use example values in
production. Generate the password hash with Node.js `crypto.scryptSync()`,
using a random 16-byte salt and base64url encoding for the salt and 64-byte
hash, separated by a period. The sign-in endpoint verifies passwords on the
server and issues an eight-hour, signed, HTTP-only session cookie. Dashboard
routes require that session; use **Sign out** to end it.

The local administrator password configured for this demo is weak and should
be replaced before deploying or exposing the app outside a trusted local
environment.

The super-admin can open **Admin Management** in the dashboard sidebar to add
database-backed admin accounts. The `app_admins` table and its case-insensitive
email index are created automatically when the management page is first
opened. New admin passwords must be at least 12 characters and are stored as
salted scrypt hashes. The configured super-admin account is shown separately
from these database accounts; fictional sample users are not presented as
real admins.

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

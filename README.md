# Saylani Sadqa Manager

## Run locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## PostgreSQL connection

The database connection is server-only and uses TLS with certificate
verification. Database settings are read from `.env`, which is ignored by Git.
Replace the `DB_PASSWORD` placeholder there with the actual PostgreSQL password;
the application refuses to connect while the placeholder remains. Never commit
the real password or expose these settings with a `NEXT_PUBLIC_` prefix.

Start the app and request
[http://localhost:3000/api/health/database](http://localhost:3000/api/health/database).
A successful connection returns `{"status":"connected"}`; a failure returns
HTTP 503 without exposing database details to the caller.

Use `getDatabasePool()` from `lib/db.ts` in server-only code for application
queries. Pass user-provided values as query parameters (for example,
`pool.query("SELECT ... WHERE id = $1", [id])`), never by concatenating them
into SQL.

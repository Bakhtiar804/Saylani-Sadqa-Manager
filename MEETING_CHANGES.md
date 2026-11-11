# Meeting changes

Implemented in TypeScript. Existing PostgreSQL records were preserved.

| Request | Implementation |
| --- | --- |
| Landing collection bars | Six explicitly illustrative cities; no real financial source reports exposed publicly |
| Collection by city | Authenticated city bar charts with year and city filters |
| Visual emphasis | Metric cards, charts, collapsible source notes, hierarchy cards and Victory Bar |
| City → area → boxes | Searchable Network Tree showing monthly reported counts separately from individual registered boxes |
| Super Admin | Can create City Admin accounts; operational records are read-only and API writes are denied |
| Rider details | Contact/account details, zone, assignments, selected-month collection history, area and box breakdown |
| Operational cost | Public operating expenses (fuel, salary and recorded categories); no invented branch expenses |
| Sidebar | Eight items for Super, City and Branch Admin; four personal-workspace links for Riders |
| Victory Bar | Top three city collection totals on the authenticated leaderboard |
| Collection status wording | Removed Verified/Unverified from current collection views and visible labels; historical database status values retained for compatibility/audit |
| Error handling | Route/root error boundaries with retry, offline banner, bounded DB/network waits and safe API responses |
| Excel import | City and Branch Admin upload → preview → import, restricted to their assigned city |
| Landing signup | Replaced with Leaderboard; no signup button remains visible |

## Data limits

The supplied workbook contains city/month aggregates, not area names, box IDs,
individual riders or rider collections. The tree displays actual area/box nodes
when individual box records exist; otherwise it explicitly says that an area
breakdown was not supplied. Rider histories use individual collection records
only. City Excel totals are never assigned to a rider or invented area.

The default rider history month is the previous calendar month in Asia/Karachi.
The month selector permits historical inspection. All City/Branch Admin queries
and import writes stay within the signed-in city's scope.

## Upload details

Screens: `/dashboard/admin/import` and `/dashboard/manager/import`.
Endpoint: `POST /api/reports/import`, multipart `.xlsx` file, up to 5 MB.
Expected sheets: Public_Collection, Branch_Collection, Public_Expense, Public_Staff.
Other-city rows are counted as excluded and never written. Preview fingerprints
must match at apply time. Formula cells require cached Excel results; formula
expressions are not executed. Malformed cells, invalid periods and duplicate
city/month/channel/category rows are rejected.

Imports use city/month/channel or city/month/expense-category business keys,
not workbook row positions. Reordered source rows do not create duplicates.
Imports preserve missing values, archive source rows and back up overwritten
city records. Financial totals and row counts reconcile before commit; a failure
rolls back the whole transaction. Reimporting an identical city-scoped workbook
is a no-op. Uploads invalidate the dashboard data cache immediately.

`database/migrate_report_uploads.sql` was applied after a rolled-back dry run;
existing report counts and totals were checked before and after migration.

## Checks

The visual revision replaces the expandable network list with connected city,
area and box nodes. Report tables on overview/coverage/analytics sit behind a
Source records & history disclosure. City and public rankings use a responsive
podium and champion ribbon; the dashboard Victory Bar uses green/gold styling.

District rankings require `database/migrate_districts.sql` on existing databases
(already applied to the configured database). New database schemas include the
nullable district field. City/Branch Admins can assign districts through box
registration or inventory Details. District edits are scoped and audited.
The landing-page public leaderboard ranks partners/companies by published box
collections across their locations. It does not rank cities or districts.
Authenticated city rankings use workbook reports; district rankings use
individual operational records.

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build --webpack`
- `npm run test:hydration`
- `npm run test:visual`
- `npm run test:meeting -- "C:\path\to\source.xlsx"`
- `npm run test:flow -- "C:\path\to\source.xlsx"`
- `npm run test:reports -- http://127.0.0.1:3100`
- `npm run test:smoke -- http://127.0.0.1:3100`

The meeting suite parses the actual workbook and tests city-scoped imports,
business-key updates, duplicate prevention, backups, rollback, rider history,
the network tree, and offline/network/API failure handling. PostgreSQL tests
run in a uniquely named scratch schema and remove only that schema afterward.
On Neon, its direct connection is used for session-scoped schema isolation.
No test account or financial record is added to the live tables.

The general smoke suite has 39 checks with the currently available fixtures.
The full-flow suite creates actual password accounts for all four roles in a
disposable schema and starts a separate production server against that schema.
It exercises login, provisioning, scoped writes, task transitions, collections,
soft deletion, stale-session rejection and Excel preview/apply over HTTP.
The live report verifier only uses accounts that actually exist; it does not
impersonate missing roles. Public record counts and report totals are checked
before and after the isolated flow, and the test schema is removed afterward.

Browser checks covered the landing chart, mobile tree, desktop sidebar,
leaderboard/Victory Bar and city import screen. No browser console errors were
observed. The temporary read-only preview service was removed after review.

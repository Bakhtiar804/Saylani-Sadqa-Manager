# Project flow verification — 11 November 2026

## Result

Production build, TypeScript, ESLint, hydration regressions, workbook/database
reconciliation, import integration tests, 39 smoke checks and 123 isolated
full-flow HTTP checks passed.

The landing city chart now uses horizontal segmented cells. Desktop and
390px mobile browser checks showed the chart correctly, with no console errors.
Its figures remain explicitly illustrative; authenticated reports use the
imported source data.

The network screen uses circular city, area and box nodes joined by straight
SVG edges, matching the supplied tree reference in the project theme. It has
searchable city selection, clickable details, area collapse/expand, zoom,
padding-aware fit and scroll controls. Its nodes come from the scoped PostgreSQL
tree query. Leaderboards use a responsive winners
podium, champion ribbon and compact ranking rows. The Victory Bar uses the
green/gold theme and proportional collection bars. Source tables are secondary
disclosures on overview, analytics and coverage screens.

When monthly source reports exist without individual box registrations, the tree
shows city → Public/Branch collection channels → reported box-count aggregates.
Collection totals use the selected year/channel, matching the report filters;
box counts remain the selected latest-month snapshot. Selecting a channel shows
its exact collection amount, reported count and source-row count. These aggregate
nodes are not individual box IDs or invented area records.

Real-data browser verification for Faisalabad showed PKR 160,965,499 for 2026,
with 8,878 reported boxes in September: 8,801 public and 77 branch boxes. Inventory
now shows the imported reported network count separately from registered IDs;
zero registered boxes no longer produces NaN% or a demo-city label.

City rankings drill down to district rankings. City/Branch Admins are restricted
to their own city's districts. The nullable district column and index migration
was applied without changing existing box counts. Registration can store a
district, and inventory Details supports audited, scoped district assignment.
District totals use actual individual collections, never allocated monthly totals.

## Fixes covered by regressions

- Validate the current database role and city on protected requests, so an old
  signed session cannot retain permissions after reassignment or soft deletion.
- Preserve cash/deposit status text instead of converting it to NaN.
- Preserve PostgreSQL calendar dates and use Karachi time for new collections.
- Include the complete selected day in date filters; reject invalid dates and
  page numbers with a validation response.
- Restrict cash to active scheduled collection tasks. Closed tasks cannot be
  reopened; skipped tasks must resume. Non-cash visits have a completion action.
- Correct PostgreSQL parameter casts in rider task updates and preserve actual
  newlines in appended notes.
- Refresh remote table data after server updates and recover from removed pages.
  Rider task tables retain all assigned rows for pagination.
- Keep a request timeout even when callers also provide a cancellation signal.
- Connect City/Branch Admin collection review to the individual register's
  Details view. Correct review SQL parameter casts, append actual newlines and
  use Recorded wording in user-facing validation/lock messages.

## Flow coverage

The isolated production-server suite uses actual password logins for Super
Admin, City Admin, Branch Admin and Rider. It verifies provisioning hierarchy,
city enforcement, forbidden writes, origin checks, box registration, task
assignment, cash/non-cash completion, duplicate protection, invalid amounts,
inclusive date filters, stale sessions, deletion with retained history, Excel
preview/apply/fingerprint/idempotency, role pages and logout. Expanded checks
cover flag → record → locked transitions, review audit history and foreign-city
denial, simultaneous duplicate cash submissions, box status history, and all
main City/Branch/Rider workspace pages. The expanded flow also verifies
district persistence, edits and foreign-city/role denial, district totals and
authenticated leaderboard scope. The 121-check run confirms that a newly
registered database box renders in its city's area/box tree and that the foreign
city's box does not appear. Browser review used the same isolated database
fixtures to inspect the populated circular graph and selected box details.

`npm run test:visual` checks podium order and empty states, public partner totals
across locations/cities, installed boxes, recorded partner attribution, legacy
box-link fallback, published-only amounts, tree hydration, city
switching, node details, branch collapse/expand, zoom/fit, edge endpoints,
non-overlapping node geometry and missing-area states. Browser checks cover the
desktop podium/Victory Bar, city search and mobile podium layout.

The public partner page renders the Victory Bar, all three podium positions,
champion ribbon and full ranking list even before partner data exists. Empty
positions use explicit awaiting labels and dashes. Available entries replace
those slots and the list includes every ranked partner. The visible page
refreshes from the server every 30 seconds and when returning online/visible.
`npm run test:leaderboard` checks empty-to-populated rendering, refresh requests,
hidden/offline guards, timer cleanup and hydration.

`npm run test:ranking` verifies that city/year changes navigate immediately,
without pressing Apply, on the authenticated city/district leaderboard. It also
checks consecutive city changes, preserved year, route-prop restoration,
city-scoped year-only filters and hydration. Filters show an updating state
while the server loads the selected ranking.

Database integration checks also cover business-key updates, source blanks and
dashes, backups and transaction rollback. Live report counts, totals and source
city mappings reconcile. Test accounts and operational writes were confined to
a uniquely named disposable schema; cleanup completed and live public counts
and collection-report totals remained unchanged.

One expanded run encountered a temporary database connection timeout. Its
interrupted fixture schema was inspected and removed; the complete repeat run
passed all 113 HTTP checks and completed its normal cleanup. The timeout was
not counted as a successful check.

## City Admin account creation regression

Live database diagnostics found `city_admin` and `branch_admin` role keys, while
account creation only looked up `admin` and `city_manager`. This produced a null
role ID and the `users_identity_auth_check` rejection. Creation now resolves both
naming schemes, account listing normalizes both labels, and scoped deletion
recognizes Branch Admin aliases. Login/session normalization remains consistent.
The legacy City Admin endpoint also validates that its selected city exists.

`npm run test:accounts` passed 43 isolated HTTP checks covering actual password
login, both role naming schemes, City/Branch/Rider provisioning, account listing,
duplicate email, legacy endpoint, invalid city, scoped deletion and permissions.
Fixtures were removed and live public record snapshots were preserved. The full
expanded run passed its account phase but later encountered a database connection
timeout; it was not counted as a completed full-flow run, and its interrupted
test schema was inspected and removed before the focused repeat.

The default flow fixtures now include the live-style role keys and test canonical
compatibility as well. `FLOW_ROLE_KEYS=canonical` retains an explicit canonical
fixture mode.

## Dashboard filter consistency

Dashboard filter behavior is unified through `AutoFilterForm`: report year/city/
channel filters, rankings and rider month filters update on selection using
Next client-side navigation, without Apply buttons or native document submits.
The transition shows a loading status, preserves scroll, and restores selected
values from server props on Back/Forward navigation. Invalid/incomplete month
values are not submitted. Table and tree filters retain their existing immediate
client-side behavior. Account creation and other write forms retain explicit
submission.

`npm run test:filters` covers combined query values, prevented native submission,
no direct document navigation, restored state, month validation and hydration.
The ranking regression, TypeScript, ESLint and production build passed. Browser
checks on the real read-only Super Admin preview verified automatic Costs city/
year changes, retained city selection, monthly/yearly chart updates, loading
states and Back restoration, with no console warnings/errors. No live writes
were performed.

## Cost chart periods

The expense period axis retains every tick (`interval=0`) with compact month
names and unchanged full source names for tooltips. Very narrow screens can
scroll the chart instead of dropping month labels. The expense-category chart
height follows category count rather than city count, and chart cards align at
the top so a tall neighbour does not stretch an empty card. `test:chart-labels`
checks retained ticks, month/year formatting, minimum width and source labels.

Costs chart tooltips retain full month names for a selected year. Selecting all
available years groups expense amounts by year and displays only year labels.
Chart titles and period captions follow the selected grouping. The chart uses
the same scoped database amounts and preserves unreported values and true zeroes.
`npm run test:expenses` verifies labels, chronological grouping, unchanged totals,
and null/zero/empty states. TypeScript and ESLint checks passed for the change.

## Analytics visual breakdowns

Analytics now has currency donut charts for collection channels, city contribution
(top five plus Other cities), and public operating expense categories, plus a
Public/Branch monthly comparison. All receive the existing scoped
`getMonthlyReports` result; no demo values or additional unscoped query is used.
Its summary cards show available collections, leading city, average of months
with reported collections, and collection-row amount completeness.

`scripts/verify-analytics-source.mjs` compared all 1,638 collection rows and 801
expense rows against the original 2024–2026 workbook, including city, month,
sheet/row, missing values and PKR amounts at cents precision. All matched.
Top-five plus Other cities also preserved the full database collection total.
Read-only browser QA confirmed donut amounts/percentages and city filtering:
Faisalabad 2026 showed PKR 160,965,499 and 100% city contribution, with matching
Public/Branch amounts and public cost categories. No live records were changed.

## Renamed account table compatibility

The connected database exposed accounts as `team_members` (`team_record_id`,
`team_id`), while application queries expected `users` (`id`, `user_id`).
Applied `database/migrate_team_members_compatibility.sql`, an invoker-security,
automatically updatable compatibility view. All 14 account records remained
in the existing table; passwords, roles and city assignments were unchanged.
PostgreSQL confirmed the view is insertable and updatable. Read-only
`scripts/verify-account-schema.mjs http://127.0.0.1:3000` verified account counts
and authenticated Overview, Analytics and City Admin pages on the running dev
server. All returned HTTP 200 with expected page content.

## Limits

These checks cover the implemented flows and confirmed regressions, not a
guarantee that every possible browser or concurrent production condition is
bug-free. The supplied monthly workbook does not contain individual historical
area/box IDs or rider collections; those details require operational records.
Cash handover/deposit records currently have a reporting view, without a separate
posting form. This is an existing capability limit, not covered as an editable
handover/deposit workflow.

The role and data flow is documented in PROJECT_FLOW.md. Repeatable commands
are listed in MEETING_CHANGES.md and package.json.

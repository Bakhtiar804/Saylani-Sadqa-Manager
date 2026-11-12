# Project flow verification — 11 November 2026

## Departure-only task completion fix — 12 November 2026

The earlier cache-only mitigation did not repair the invalid completion records.
The reported tasks contained legacy direct Assigned → Completed state changes,
without task-linked denomination counts or cash-count visits. The original
writer was not identifiable from the current source, database functions or
triggers; the final fix therefore enforces the workflow in the database as well
as the API/client.

- Progress and cash submission now use distinct typed client actions. Every
  progress button has `type="button"`; only the confirmed cash form submits cash.
  A completion response to a departure action is rejected.
- Database guards reject skipped steps, raw real-money inserts, mismatched
  denominations and completion without a linked collection and field visit.
- Both reported invalid tasks were restored with full before/after audit.
  Their unconfirmed, uncounted cash side effects remain preserved as Voided;
  original amounts were not changed and are excluded from operational totals.
- Replayed the requested departure action on both real affected tasks: each
  became In Progress / departed (On the way), completion time remained NULL,
  and collection row counts did not increase. Both tasks are now On the way.
- Production build, TypeScript, targeted ESLint, Rider UI regressions and
  isolated database guard/privacy tests passed. All 193 isolated full-flow
  HTTP checks passed with guards enabled, including cash counting/submission,
  duplicate prevention, reviews, all role pages and Excel import.

## Rider task stale-status recovery — 12 November 2026

- The affected live task was already Completed while the browser displayed
  Assigned. Its legacy workflow label was `completed`; a collection also existed
  for the same Rider, box and date. No task or cash records were reopened/changed.
- Rider operational queries now read fresh on each request. Successful mutations
  immediately update the displayed step; conflict responses include current state
  and refresh stale cards instead of leaving obsolete actions visible.
- Completed tasks with legacy workflow labels render the submitted step.
- Production build, TypeScript, targeted ESLint, cash validation and Rider UI
  regression tests passed, including stale closed and advanced-task responses.
- A live authenticated check confirmed the affected card displays Completed with
  no departure button. An invalid-stage conflict probe returned Completed/submitted
  without modifying task or collection records.

## Rider privacy and task notification bell — 12 November 2026

- Production build and targeted TypeScript/ESLint checks passed.
- 193 isolated production-build HTTP checks passed, including notification
  authentication, Rider-only access, foreign-task denial, origin validation,
  persistent read state, the collection workflow and all role pages.
- Dedicated database tests verified personal profile/history/task/box isolation
  between Riders in the same city and in different cities, TEM-style account IDs,
  month filtering, missing-identity denial and preserved administrative scopes.
  A Rider retains their own historical collections after a city transfer.
- Notification database tests verified new-task unread counts, idempotent read
  updates and transaction rollback when a batch contains another Rider's task.
- Notification UI tests passed hydration, badge/popup, task links, read requests,
  keyboard closing, new-task refresh and network failure/retry handling.
- Notification columns were added to the connected database. Test fixtures ran
  in temporary schemas and were removed; live account/collection/report records
  were preserved.

## Rider collection workflow — 12 November 2026

- Production build and TypeScript checks passed; targeted ESLint checks passed.
- 184 isolated full-flow HTTP checks passed against the production build,
  including real password login, scoped task assignment, ordered Rider steps,
  skip/resume, denomination validation, calculated totals, collection review,
  simultaneous submissions, account protections, all role pages and workbook import.
- Database assertions confirmed saved denomination quantities, coin/note subtotals,
  task link, progress timeline, completed task and one field visit log per submission.
  A supplied forged amount was ignored in favor of the calculated denomination total.
- Rider UI hydration and interaction tests passed: departure/arrival/counting actions,
  11 denomination inputs, automatic total, confirmation, receipt and network retry
  preserving entered quantities.
- Cash calculation tests covered mixed denominations, invalid quantities, unsupported
  denominations, total limits and out-of-order transitions.
- The live additive migration was applied and verified repeatable. Existing task and
  collection counts and collection totals were preserved. Full-flow test fixtures
  ran in a temporary isolated schema, which was removed; live account, collection
  and imported report snapshots remained unchanged.
- TypeScript excludes local ` - Copy` backup folders/files, keeping copied old sources
  out of the active build without modifying those backups.

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

## Team directory editing and role filters

Team Accounts now uses a full-width directory with role filtering, search,
member identity/contact layout, scoped Edit/Delete actions, and one login-status
badge. A differing Rider employment status is labeled separately. Creation is
available in an expandable form below the directory. PATCH persists contact,
login status and Rider zone/employment changes in a transaction; it rejects
role/city/password changes, self edits, foreign cities and unauthorized roles.
Super Admin can now edit/remove City Admins; City/Branch scopes retain their
existing hierarchy. Delete retains historical references through soft deletion.

`node scripts/test-team-directory.mjs` passed role filtering, status rendering,
action visibility, edit request payload, saved row refresh and delete dialog.
`FLOW_ACCOUNT_VIEW=1 npm run test:accounts` passed 61 isolated HTTP checks with
the renamed team_members/compatibility-view schema, including persistence,
duplicate-email rollback, role/city/origin restrictions, deactivation and removal.
Live account/collection/report snapshots were unchanged after fixture cleanup.
Final live QA uncovered renamed Rider and other account-reference columns plus
an identical duplicate account table. Applied `migrate_restore_account_names.sql`
transactionally: original account table/columns and references now match the app,
and the duplicate is archived. All 14 stable account identities, contact fields,
password hashes, roles, statuses and dates were compared before commit; financial
counts/totals were unchanged. Browser QA verified the real directory, City Admin
role filtering and prefilled Edit dialog without saving/deleting live accounts.
TypeScript, ESLint and production build passed.

## Canonical team_members table

The project owner requested `team_members` as the physical account table.
Runtime SQL for authentication, team editing/removal, rider profiles, collection
joins, inventory and audit reads now uses it directly. Fresh schema, seeds,
foreign keys, maintenance scripts and test fixtures use the same table name.
The stable `user_id` reference columns are unchanged. Prior reverse-name and
compatibility-view migrations were retired; this section supersedes their
historical workaround notes above.

Applied `npm run migrate:team-members` transactionally on the live database.
Verified all 14 complete account rows (including password hashes), original table
OID, 16 foreign-key definitions and monthly collection totals before committing.
The migration was reapplied safely; `public.users` does not exist as a table or
view. No account copies were created by this migration.

TypeScript, ESLint, production build and the team-directory UI test passed.
Authenticated read-only requests on the running dev server loaded Overview,
Analytics and Team Accounts successfully with real team_members records.
`FLOW_ACCOUNT_RENAME=1 npm run test:flow -- <source-workbook>` passed **158
isolated full-flow HTTP checks**: repeatable physical-table migration, all four
role logins, account create/edit/remove, scope guards, rider tasks/collections,
cash review/audit, inventory, Excel preview/import, all role pages and logout.
Fixture cleanup completed and live account/collection/report snapshots matched
their pre-test values.

## Super Admin actions across team roles

Super Admin can now edit/remove City Admin, Branch Admin and Rider accounts.
The same shared policy controls UI visibility and backend authorization;
operational-record write permissions and City/Branch city scopes are unchanged.
The expandable Create a team account section appears above the directory.
Updated UI regression passed with explicit Branch Admin Edit/Delete buttons.
`npm run test:accounts` passed 68 isolated HTTP checks, including Super Admin
Branch Admin edit/delete, Rider edit/delete, persisted data and login denial after
removal. Live records remained unchanged after fixture cleanup. TypeScript,
targeted ESLint and production build passed.

## Canonical team_id column contract

The live schema uses team_members.team_record_id/team_id and team_id or
*_team_id references throughout Riders, collections, audit and import tables.
Updated runtime SQL, record keys, client consumers, schema/seed and maintenance
scripts to those names. This supersedes the earlier table-only migration notes
that retained user_id column names. Session/API userId values remain the same
stable account identifiers; existing cookies and passwords are preserved.

The forward migration now normalizes legacy numeric/id/reference column names
as well as the table name. Its runner compared all 14 complete live account rows,
table identity, 16 foreign keys and report totals, and verified repeatability.
Read-only authenticated requests on the running dev server loaded Overview,
Analytics and Team Accounts. TypeScript, ESLint, team UI checks and production
build passed. Full isolated testing with legacy columns followed by migration
passed **165 HTTP checks**, including all roles, team edit/delete, rider cash/task
flows, audit, inventory, Excel import and logout. Fixture cleanup verified live
account/collection/report snapshots were unchanged.

## Network Tree to inventory

Selected-city tree links now retain city, reporting year, collection channel and
snapshot month. Inventory shows the same DB-imported monthly source counts and
their source rows above individual registered inventory on Super, City and
Branch pages. Registered records/history also respect the Super Admin city
selection; City/Branch scopes remain enforced by the server. Missing individual
IDs/locations are not synthesized from aggregate workbook counts.

Tree hydration tests verified inventory URL changes on city switching and keeps
year/channel/month. `verify-tree-inventory.mjs` checked authenticated production
HTML against live DB rows: Faisalabad September 2026 has 8,878 reported boxes
(8,801 Public + 77 Branch); Branch-only shows 77. City and Branch inventory pages
ignored a foreign city parameter and displayed only assigned-city source rows.
All queries were read-only. TypeScript, targeted ESLint and production build
passed. Temporary production preview was stopped after verification.

## Shared selected city for every inventory link

The tree previously changed its local city while page-heading/footer inventory
links retained the server's original all-cities filter. Coverage now shares one
client city selection across the diagram and all three inventory entry points.
Regression hydration tests switch Karachi to Lahore and assert every inventory
link carries Lahore plus the same year, month and channel. TypeScript and
targeted ESLint passed. Server-side inventory city filtering remains unchanged.

## Streaming dashboard runtime data

DashboardLayout now renders a synchronous Suspense boundary around its async
authentication/session check, with a nested content fallback. MonthlyReportPage
also has its own synchronous boundary around MonthlyReportContent, placing
connection(), session reads and uncached reporting queries below a boundary
inside the page navigation scope. Removed the layout's blocking instant=false
opt-out. Authentication and city/role checks remain request-time operations.

Local installed Next.js documentation was checked for connection(), loading
boundary placement and instant navigation scopes. Production build passed and
dashboard routes now have partial-prerendered shells. Targeted ESLint passed.
Authenticated GET checks on the running local server passed Overview, Network
Tree, Analytics and Team Accounts. The Network Tree response contained the
loading fallback before tree content and no blocking-prerender-dynamic message.
Streaming improves loading feedback; database request duration is independent.

## Compact overview collection charts

The monthly trend uses readable month names on every tick and full month/year
tooltips, keeping year context when multiple years are selected. Compact PKR-axis
units replace long thousands labels. Both overview comparison bodies are 280px
high. City comparisons now have scrollable HTML rows with complete city names,
exact formatted amounts and proportional bars, retaining all cities and null
amount states without an oversized chart or overlapping SVG labels.

`test:chart-labels` passed month/year labels, unchanged data references, null
values, 32 complete city rows and nine-month fit in a narrow desktop card.
TypeScript, targeted ESLint and final production build passed. Production browser
QA confirmed all Jan–Sep labels, aligned card bottoms, working city-list scrolling
and readable Nawabshah (Shaheed Benazirabad) without overlap. Database records
were not changed. Temporary GET preview and production server were stopped.

## Stable chart hydration attributes

The reported hydration diff used the prior 424px client sizing against the newer
388px server sizing. A read-only DB check confirmed the same nine reporting
months (January–September 2026). Trend density now lives in CSS; React serializes
only height, period count and multi-year state, avoiding changing inline width
arithmetic when spacing is adjusted. A pre-existing browser tab still needs one
hard refresh to discard its previous client bundle.

`npm run test:chart-hydration` renders SSR HTML, hydrates it with React, verifies
identical wrapper attributes and no hydration errors/warnings, then changes to
multi-year data. Chart label/city regression checks, TypeScript, targeted ESLint
and production build also passed. Data values and DB records were unchanged.

## Inventory collection amounts and aggregate-tree wording

Reported-only tree cities now say that area names and individual box IDs were
not supplied, instead of showing confusing zero area/registered-box labels in
the summary and city details. Reported snapshot box counts remain visible.
Inventory now includes a Reported collection card using the same city/year/channel
DB period total as the tree. Source rows separately label their snapshot-month
collection amount, keeping period sums distinct from monthly values.

Read-only authenticated checks matched Badin 2026 Rs 124,259 and September's
65 reported boxes. Faisalabad matched Rs 160,965,499 / 8,878 boxes, and Branch-only
matched Rs 70,694,992 / 77 boxes. Missing Branch amounts remain unreported. Both
restricted admin roles still ignored foreign-city URL parameters. Updated tree
UI regression, TypeScript, targeted ESLint and production build passed.

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

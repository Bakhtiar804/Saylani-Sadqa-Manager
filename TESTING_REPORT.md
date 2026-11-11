# Project flow verification — 11 November 2026

## Result

Production build, TypeScript, ESLint, hydration regressions, workbook/database
reconciliation, import integration tests, 39 smoke checks and 120 isolated
full-flow HTTP checks passed.

The landing city chart now uses horizontal segmented cells. Desktop and
390px mobile browser checks showed the chart correctly, with no console errors.
Its figures remain explicitly illustrative; authenticated reports use the
imported source data.

The network screen now has a connected city root, area branches and expandable
box nodes, with searchable city selection. Leaderboards use a responsive winners
podium, champion ribbon and compact ranking rows. The Victory Bar uses the
green/gold theme and proportional collection bars. Source tables are secondary
disclosures on overview, analytics and coverage screens.

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
main City/Branch/Rider workspace pages. The expanded 120-check run also verifies
district persistence, edits and foreign-city/role denial, district totals and
authenticated leaderboard scope.

`npm run test:visual` checks podium order and empty states, public partner totals
across locations/cities, installed boxes, recorded partner attribution, legacy
box-link fallback, published-only amounts, tree hydration, city
switching, box expansion and missing-area states. Browser checks cover the
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

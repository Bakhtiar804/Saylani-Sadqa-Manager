# Real monthly donation and expense reports

**Current workflow:** see [MEETING_CHANGES.md](MEETING_CHANGES.md) for the new
TypeScript dashboard Excel upload, tree views, rider history and role policy.
City and Branch Admins can now upload their own city's reports from the UI.
Super Admin is read-only for operational data and can create City Admins only.

The authenticated overview, Collections, Expenses, Box Counts & Public Staff,
and Analytics now read the supplied monthly reports from PostgreSQL. City Admin
and Branch Admin views are restricted to the operating city in their session.
The year defaults to the latest available year; select **All available years**
to include the entire workbook.

## Source and meaning

The supplied workbook covers January 2024 through September 2026:

| Source sheet | Meaning | Imported rows |
| --- | --- | ---: |
| Public_Collection | City/month public amount and box count | 1,023 |
| Branch_Collection | City/month branch amount and box count | 615 |
| Public_Expense | City/month public expense category | 801 |
| Public_Staff | City/month public staff headcount | 462 |

The other sheets are summaries, comparisons, city reference data, and helper
lists. All 12 sheets' nonempty rows, cached values, and formulas are archived in
`report_source_rows`. Summary rows are never imported as additional amounts.
In particular, Public_Expense row 804 is a total, not another expense.

The workbook contains **39 unreported collection amounts** and **46 unreported
expense amounts** (36 blank cells and 10 dashes). These remain NULL. Explicit
zeros remain zero. Source totals use available amounts and are labelled as
reported, not independently verified financial transactions.

Amounts retain up to ten decimal places in PostgreSQL because the source
contains fractional calculated values. Headline amounts display whole PKR;
record amounts display at most two decimals. Full source values remain in the
archive. All-period available collections reconcile to PKR 992,669,234.28571429;
available public expenses reconcile to PKR 126,642,080.33333333 before display
rounding. These totals are source reports, not a profit calculation.

Box counts and staff are **snapshots**. Headline counts use only the latest
month within the selected period, with the snapshot date and city coverage
shown. Staff counts are for the public operation and are not rider accounts.
Monthly staff counts and box counts are never added across reporting periods.
Expense reports cover public operations; the workbook supplies no branch
expense register or individual donation, donor, rider, partner, or box IDs.
No such records have been invented from monthly aggregates.

## City mapping

`reporting_cities.operational_city_id` links source-report cities to login-account
city scopes. Existing operating city IDs and all accounts are preserved. New
reporting cities are added using stable IDs. Missing provinces remain explicitly
`Not supplied`; coordinates and provinces are copied only from Dim_City.

Explicit spelling aliases: Sukkur City → Sukkur, Umerkot City → Umerkot,
Tando Alahyar → Tando Allahyar, Nawab Shah → Nawabshah (Shaheed Benazirabad).
Original city text is retained on every source record. Ambiguous names such as
Lodrah remain as supplied. Reference-only cities do not appear as reporting
cities unless reports exist.

## Repeatable import

The source workbook stays outside the repository and is never modified.
Use Python with `openpyxl` for read-only extraction. The Windows bundled runtime
is detected automatically; elsewhere set `PYTHON_BIN` if needed.

```powershell
npm run import:reports -- "C:\path\to\workbook.xlsx"
npm run import:reports -- "C:\path\to\workbook.xlsx" --apply
npm run test:reports
```

The first command is a dry run and rolls back its entire transaction. The second
applies `database/migrate_monthly_reports.sql`, records the source SHA-256,
archives every nonempty source row and backs up previous report rows in
`report_import_backups`. It upserts by source sheet/row in one locked transaction,
then checks each value, month, city, category/channel, box count and record count.
Identical workbook fingerprints are skipped on rerun. Existing operational
records and users are not deleted or reseeded. Restart the app after a command-line
import to discard any cached report results (normal cache revalidation is 10s).

This importer updates one authoritative workbook's source-sheet/row slots.
It is not an append importer for multiple overlapping workbooks. For a replacement
with removed/reordered rows, review the dry run and existing source row keys first.
Imports that omit existing source slots are rejected rather than deleting rows
or leaving stale amounts in the active totals.

## Operational registers

Monthly reports and individual operational records remain separate:

- `/dashboard/transactions`: individual collection and field registers.
- `/dashboard/inventory`: register actual individual boxes and change statuses.
- `/dashboard/handovers`: individual cash handover/deposit register.
- City/Branch Admin equivalents: `.../transactions` and `.../inventory`.
- Rider task updates and collection submission remain in the rider workspace.

Empty operational registers mean no individual records were supplied. The monthly
workbook is not publicly exposed through the landing page or partner leaderboard.

## Verification

`npm run test:reports -- http://127.0.0.1:3100` also checks the locally running
app's reporting pages and filters. When a role has no database fixture, it uses a
short-lived signed local test session to exercise that role's scope without
creating or changing an account. This does not test successful password login.

The command checks source-row reconciliation, NULL/dash semantics, duplicate
prevention, city mappings, all 12 archived source sheets, and role-scoped pages.
Run the existing `npm run test:smoke -- http://127.0.0.1:3100` for general auth,
route and collection-API checks.

# Application flow

## Access

`team_members` is the physical account table used by all SQL queries. Existing
account references use `team_id` columns with their existing ID values; there is no `users`
compatibility view. Existing databases migrate with `npm run migrate:team-members`.

| Role | Account actions | Operational access |
| --- | --- | --- |
| Super Admin | Create City Admins; edit/remove City Admin, Branch Admin and Rider accounts | Read network reports and operational records |
| City Admin | Create/edit/remove Branch Admin or Rider accounts in own city | Register boxes, assign tasks, change box status, review collections and import own-city reports |
| Branch Admin | Create/edit/remove Rider accounts in own city | Assign tasks, change box status, review collections and import own-city reports |
| Rider | None | View own profile, tasks and collections; submit assigned work |

Passwords are checked at login. Protected requests also compare the cookie's
role and city with the current active database account. Scope is enforced on
the server, independently of form fields and URL filters.

The team directory has role filtering and search. Edit saves contact details,
login status and Rider zone/employment details through PATCH `/api/team-accounts`.
Role, city and password remain outside this edit form. Removal disables sign-in
and retains the account row for historical references. Matching login/employment
statuses display once; differing employment status has an explicit label.

## Individual operational records

1. A City Admin registers a box through Network Tree → Registered box inventory.
   The database-backed diagram groups it under its city and area. The tree uses
   circular nodes and straight connecting lines. Select a node for details,
   collapse/expand area branches, or use zoom/fit and scrolling to explore.
   Where only monthly source reports are available, the diagram instead shows
   Public/Branch collection totals and reported box-count aggregate nodes. Those
   figures use the same year/channel filters as reports. Monthly totals do not
   create individual box IDs or inferred area names.
2. A City/Branch Admin assigns a rider through Rider Details. Box and rider must
   belong to that admin's city. Cash tasks require an active box and rider.
3. The rider starts an assigned task. Scheduled collections accept a positive
   PKR amount with up to two decimal places. Non-cash visits use Complete visit.
4. Cash submission stores the collection and completes the task in one database
   transaction. Concurrent duplicate submissions cannot create two collections.
5. A City/Branch Admin opens Collections → Individual collection register →
   Details to flag or record the entry. A flag requires a reason; recorded entries
   are locked. Each review is retained in audit history.
6. Rider Details shows the selected month's collections by area and box. The
   default month is the previous calendar month in Karachi time.
7. Box registration can include a district. City/Branch Admins can assign or
   correct it from inventory Details; changes are audited. Leaderboard shows
   cities at network level and districts within a selected city. Restricted
   admins only see their own city's districts. District totals use individual
   collections; unassigned boxes are identified rather than guessed.

Cancelled/completed tasks remain closed. Skipped tasks must resume before
completion. Soft deletion blocks login and old sessions while retaining history.
Cash handover/deposit registers currently display stored records; they do not
provide a separate handover/deposit posting form.

## Monthly workbook reporting

1. A City/Branch Admin selects Excel Import and previews the supplied workbook.
2. Preview includes that admin's city only and reports excluded source rows.
3. Apply verifies the preview fingerprint, backs up replaced records, archives
   source rows and reconciles the write inside a transaction.
4. Reimporting the same city-scoped file is a no-op. Changed rows update by
   city/month/channel or expense category rather than source row position.
5. Overview, Collections, Operational Cost, Analytics and Leaderboard read the
   monthly database tables. City/Branch filters cannot widen the city scope.

Monthly totals are separate from individual rider cash submissions. The source
workbook cannot supply missing historical rider, area or box-level detail.

The public landing chart is labelled illustrative. The landing-page Leaderboard
opens Partner Leaderboard: each company/partner is ranked by published collection
totals from all its linked boxes across branch locations and cities. Installed
box counts are shown alongside the amounts. Recorded partner attribution is
preserved; older collections without a partner can use their box's partner link.
City/district rankings remain in the authenticated dashboard. Monthly workbook
finances are available in the authenticated workspace.

The partner page is fully laid out before data arrives: Victory Bar, podium,
champion highlight and full leaderboard. Empty slots are labelled awaiting data.
It refreshes automatically while visible, so newly recorded partner collections
can populate the existing UI without rebuilding or manually entering rankings.

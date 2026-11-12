# Sadqa Manager database guide

## Rider collection workflow

Run `npm run migrate:rider-workflow` against an existing database before deploying
the Rider workflow. New databases get the same fields from `schema.sql`.
The migration is additive and repeatable; historical tasks keep their status and
do not receive invented departure/arrival timestamps.

Collection tasks advance through assigned → departed → arrived → counting →
submitted. `rider_tasks.workflow_events` stores server timestamps and visit notes.
Rider submissions accept denomination quantities rather than a manually entered
amount. The server calculates coins, notes and total, and atomically saves the
collection, cash breakdown, field log, completed task and audit entry. The unique
`collections.rider_task_id` index prevents duplicate collection records per task.
Handover and deposit start as Pending; submitting a collection does not confirm
that cash was received or deposited.

This folder contains a readable PostgreSQL schema and local demo data. These
scripts are for development only; do not load the demo credentials or seed into
production.

## What each table is for

| Table                    | Simple purpose                                                                                                                                                                                                                 | Key columns to recognize                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `roles`                  | Defines the four app roles.                                                                                                                                                                                                    | `role_id`, `role_key`, `display_name`                                                                                                    |
| `team_members`           | Stores people and login accounts. Login users have a role and password hash; field staff and partner contacts are reference identities without either. Deleted accounts retain their row and references with `deleted_at` set. | `team_id`, `full_name`, `email`, `phone`, `city_id`, `role_id`, `identity_type`, `account_status`, `password_hash`, `deleted_at`         |
| `cities`                 | One shared list of cities used by the other records.                                                                                                                                                                           | `city_id`, `city_name`, `province`                                                                                                       |
| `partners`               | Organizations or locations that host/support donation boxes.                                                                                                                                                                   | `partner_id`, `partner_name`, `city_id`, `contact_person`, `email`, `partnership_status`                                                 |
| `riders`                 | Rider-only employment details; the rider's name and contact details live in `team_members`.                                                                                                                                           | `rider_id`, `team_id`, `employment_status`, `assigned_zone`                                                                              |
| `donation_boxes`         | Register of boxes, their locations, custodian, partner, assigned rider, and current status.                                                                                                                                    | `box_id`, `qr_code`, `city_id`, `custodian_team_id`, `partner_id`, `assigned_rider_id`, `box_status`                                     |
| `collections`            | Main record of money collected from a box, with verification and cash handover/deposit details.                                                                                                                                | `collection_id`, `box_id`, `rider_id`, `collection_date`, `collection_amount_pkr`, `collection_status`, `recorded_by_team_id`            |
| `rider_tasks`            | Work assigned to a rider for a box on a date.                                                                                                                                                                                  | `task_id`, `rider_id`, `box_id`, `task_date`, `task_type`, `task_status`                                                                 |
| `field_collection_logs`  | Detailed record of a rider's field visit, cash count, box condition, and verification.                                                                                                                                         | `field_collection_id`, `task_id`, `box_id`, `rider_id`, `collection_date`, `total_cash_counted_pkr`, `collection_status`                 |
| `cash_handover_deposits` | Tracks cash moving from a rider to a receiver and then to a bank/deposit.                                                                                                                                                      | `handover_id`, `from_rider_id`, `received_by_team_id`, `amount_declared_pkr`, `amount_received_pkr`, `handover_status`, `deposit_status` |
| `box_inspections`        | Inspection snapshots for box condition, lock, seal, safety, and follow-up.                                                                                                                                                     | `inspection_id`, `box_id`, `inspected_by_team_id`, `inspection_date`, `box_condition`, `follow_up_required`                              |
| `box_status_history`     | Audit trail of each box status change.                                                                                                                                                                                         | `history_id`, `box_id`, `previous_status`, `new_status`, `changed_by_team_id`, `changed_on`                                              |
| `security_incidents`     | Reports damage, tampering, theft, or other box/security incidents.                                                                                                                                                             | `incident_id`, `box_id`, `reported_by_team_id`, `incident_date`, `severity`, `incident_status`                                           |
| `operational_costs`      | Monthly operating expenses for a city.                                                                                                                                                                                         | `cost_record_id`, `city_id`, `month`, `cost_category`, `cost_amount_pkr`                                                                 |

The key columns above are a quick guide, not the complete column list. For
example, `collections` and `field_collection_logs` also have cash breakdown,
seal, witness, handover, deposit, and notes columns.

## Demo sign-in credentials

All mock login accounts share this local-only password: **`DemoOnly@123`**.
Each account has a different salted scrypt hash in PostgreSQL; the plaintext
password is not stored in the seed SQL or database.

| Role         | Email 1                       | Email 2                       | Password       |
| ------------ | ----------------------------- | ----------------------------- | -------------- |
| Super Admin  | `user0089@demo.sadqabox.test` | `user0213@demo.sadqabox.test` | `DemoOnly@123` |
| City Admin   | `user0007@demo.sadqabox.test` | `user0011@demo.sadqabox.test` | `DemoOnly@123` |
| Branch Admin | `user0013@demo.sadqabox.test` | `user0039@demo.sadqabox.test` | `DemoOnly@123` |
| Rider        | `user0015@demo.sadqabox.test` | `user0021@demo.sadqabox.test` | `DemoOnly@123` |

These are seeded database identities. Sign-in checks their active status and
password hash in `team_members`, then reads the role from `roles`. Inactive mock Rider
accounts cannot sign in. Super Admin can create additional City Admin accounts
from the dashboard; those accounts are saved in `team_members` with the City Admin role.

Dashboard operational screens read cities, team members, partners, riders, boxes,
collections, tasks, handovers, inspections, incidents, and costs from these
PostgreSQL tables. KPI definitions, the field dictionary, and research notes
remain documentation in the project data files because they are not operational
database tables.

## Apply scripts

### Canonical account table: `team_members`

Existing installations with a physical `users` table should run
`node scripts/migrate-team-members.mjs` (or `migrate_team_members.sql`). This
transaction renames the original table without copying accounts or creating a
`users` alias. The runner verifies every account field, physical table identity,
foreign-key references and report totals before committing, and checks that the
migration is repeatable. Conflicting account tables stop the migration.
Legacy `user_id`/`*_user_id` columns are renamed to `team_id`/`*_team_id`, and
the generated account row key is `team_record_id`. Identifier values are retained.

The canonical primary reference is `team_id` on team_members and related
tables, including Riders and financial/audit records. Existing session account
IDs, passwords and permission scopes remain valid. All runtime SQL, fresh
schema, seeds and maintenance scripts use `team_members`. Prior reverse-name
and compatibility-view migrations have been retired.

Verify against a running local server with
`node scripts/verify-account-schema.mjs http://127.0.0.1:3000`.

Run these files in order against a development database:

1. `schema.sql`
2. `seed_demo.sql`
3. `migrate_app_admins.sql`
4. `migrate_team_account_deletion.sql` (required on an existing database before using account deletion)
5. `migrate_activity_audit_log.sql` (required for rider task updates, collection submission, and collection review)

The scripts are additive and repeatable. They preserve the existing numeric
`team_members.team_record_id`, do not delete the legacy `app_admins` table or existing rows, and
use a unique text `team_members.team_id` for the mock IDs referenced by source data.
The migration copies the existing legacy accounts into `team_members`; keep the
legacy table until the new login flow is verified.

## Expected row counts

Counts below are for a fresh demo seed plus the two legacy `app_admins` rows
that existed in the connected development database when migration was applied.

| Table                    |                                        Rows |
| ------------------------ | ------------------------------------------: |
| `roles`                  |                                           4 |
| `team_members`           | 250 mock + 2 migrated legacy accounts = 252 |
| `cities`                 |                                           5 |
| `partners`               |                                           9 |
| `riders`                 |                                          45 |
| `donation_boxes`         |                                         572 |
| `collections`            |                                       1,600 |
| `rider_tasks`            |                                         300 |
| `field_collection_logs`  |                                         250 |
| `cash_handover_deposits` |                                         100 |
| `box_inspections`        |                                         120 |
| `box_status_history`     |                                         150 |
| `security_incidents`     |                                          30 |
| `operational_costs`      |                                          15 |

The mock people include 65 login accounts (2 Super Admin, 8 City Admin, 10 Branch Admin, 45 Rider)
and 185 Field Staff/Partner identities. The latter have no
role or password hash and are kept because operational records refer to them.

node -e 'const {scrypt,randomBytes}=require("node:crypto"); const p=process.argv[1]; const s=randomBytes(16).toString("base64url"); scrypt(p,s,64,(e,k)=>{if(e)throw e; console.log(`${s}.${Buffer.from(k).toString("base64url")}`)})' 'USMAN12345'

To Generate Password in Hash

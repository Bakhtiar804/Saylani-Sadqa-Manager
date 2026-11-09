import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import type { CityOption, DataRecord } from "@/lib/dashboard-types";

export const DASHBOARD_DATA_CACHE_TAG = "dashboard-db-records";

type DashboardRecord = DataRecord & {
  user_id?: string | null;
  rider_id?: string;
  box_id?: string | null;
  partner_id?: string;
  city_id?: string | null;
  task_id?: string | null;
  full_name?: string | null;
  rider_name?: string | null;
  partner_name?: string;
  city_name?: string;
  role?: string | null;
  identity_type?: string | null;
  account_status?: string;
  employment_status?: string;
  assigned_zone?: string | null;
  assigned_rider_id?: string | null;
  box_status?: string;
  task_status?: string;
  collection_status?: string;
  incident_status?: string;
  incident_type?: string | null;
  severity?: string | null;
  box_condition?: string | null;
  follow_up_required?: string | null;
  partnership_status?: string | null;
  partner_type?: string | null;
  cost_category?: string | null;
  month?: string | null;
  collection_date?: string | null;
  incident_date?: string | null;
  inspection_date?: string | null;
  collection_id?: string | null;
  collection_amount_pkr?: number | null;
  total_cash_counted_pkr?: number | null;
  cost_amount_pkr?: number | null;
};

export function formatPKR(value: number | string | null | undefined): string {
  return `Rs ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;
}

async function readRows(sql: string, parameters?: unknown[]): Promise<DashboardRecord[]> {
  const result = await getDatabasePool().query(sql, parameters);
  return result.rows.map((row: Record<string, unknown>) => {
    const normalized: DashboardRecord = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) normalized[key] = value.toISOString();
      else if (
        typeof value === "string" &&
        (/(_pkr|_amount|^amount_|^difference_pkr$|^installed_boxes$|^active_boxes$|^inactive_boxes$|^damaged_boxes$|^under_review_boxes$|^verified_count$|^pending_count$|^flagged_count$|^collection_count$|^records$|^boxes$|^tasks$|^completed_tasks$|^needs_attention_boxes$)/i.test(key))
      ) normalized[key] = Number(value);
      else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) normalized[key] = value;
      else normalized[key] = String(value);
    }
    return normalized;
  });
}

const dashboardQueries = {
  cities: "SELECT city_id, city_name, province FROM cities ORDER BY city_name",
  partners: `SELECT p.*, c.city_name FROM partners p JOIN cities c USING (city_id) ORDER BY p.partner_name`,
  users: `
      SELECT u.user_id, u.full_name, u.email, u.phone, u.city_id, c.city_name,
        COALESCE(r.display_name,
          CASE u.identity_type WHEN 'field_staff' THEN 'Field Staff' WHEN 'partner_identity' THEN 'Partner' END
        ) AS role,
        u.identity_type,
        CASE WHEN u.deleted_at IS NOT NULL THEN 'Deleted' ELSE INITCAP(u.account_status) END AS account_status,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN cities c ON c.city_id = u.city_id
      ORDER BY u.full_name, u.user_id
    `,
  riders: `
      SELECT r.*, u.full_name AS rider_name, u.phone, u.city_id, c.city_name
      FROM riders r JOIN users u USING (user_id)
      LEFT JOIN cities c ON c.city_id = u.city_id
      ORDER BY u.full_name
    `,
  donationBoxes: `
      SELECT b.*, c.city_name, custodian.full_name AS custodian_name,
        p.partner_name, rider_user.full_name AS assigned_rider_name
      FROM donation_boxes b
      JOIN cities c ON c.city_id = b.city_id
      LEFT JOIN users custodian ON custodian.user_id = b.custodian_user_id
      LEFT JOIN partners p ON p.partner_id = b.partner_id
      LEFT JOIN riders r ON r.rider_id = b.assigned_rider_id
      LEFT JOIN users rider_user ON rider_user.user_id = r.user_id
      ORDER BY b.box_id
    `,
  collections: `
      SELECT collection.*, city.city_name, partner.partner_name,
        rider_user.full_name AS rider_name,
        recorder.full_name AS recorded_by_name,
        counter.full_name AS counted_by_name,
        verifier.full_name AS verified_by_name,
        custodian.full_name AS custodian_name
      FROM collections collection
      JOIN cities city ON city.city_id = collection.city_id
      LEFT JOIN partners partner ON partner.partner_id = collection.partner_id
      JOIN riders rider ON rider.rider_id = collection.rider_id
      JOIN users rider_user ON rider_user.user_id = rider.user_id
      JOIN users recorder ON recorder.user_id = collection.recorded_by_user_id
      LEFT JOIN users counter ON counter.user_id = collection.counted_by_user_id
      LEFT JOIN users verifier ON verifier.user_id = collection.verified_by_user_id
      LEFT JOIN users custodian ON custodian.user_id = collection.custodian_user_id
      ORDER BY collection.collection_date DESC, collection.collection_id
    `,
  riderTasks: `
      SELECT task.*, box.city_id, city.city_name, rider_user.full_name AS rider_name
      FROM rider_tasks task
      JOIN donation_boxes box ON box.box_id = task.box_id
      JOIN cities city ON city.city_id = box.city_id
      JOIN riders rider ON rider.rider_id = task.rider_id
      JOIN users rider_user ON rider_user.user_id = rider.user_id
      ORDER BY task.task_date DESC, task.task_id
    `,
  fieldCollectionLog: `
      SELECT field.*, city.city_name, partner.partner_name,
        rider_user.full_name AS rider_name,
        custodian.full_name AS custodian_name,
        counter.full_name AS counted_by_name,
        verifier.full_name AS verified_by_name
      FROM field_collection_logs field
      JOIN cities city ON city.city_id = field.city_id
      LEFT JOIN partners partner ON partner.partner_id = field.partner_id
      JOIN riders rider ON rider.rider_id = field.rider_id
      JOIN users rider_user ON rider_user.user_id = rider.user_id
      LEFT JOIN users custodian ON custodian.user_id = field.custodian_user_id
      LEFT JOIN users counter ON counter.user_id = field.counted_by_user_id
      LEFT JOIN users verifier ON verifier.user_id = field.verified_by_user_id
      ORDER BY field.collection_date DESC, field.field_collection_id
    `,
  cashHandoverDeposit: `
      SELECT handover.*, city.city_name, rider_user.full_name AS rider_name,
        receiver.full_name AS received_by_name
      FROM cash_handover_deposits handover
      JOIN cities city ON city.city_id = handover.city_id
      JOIN riders rider ON rider.rider_id = handover.from_rider_id
      JOIN users rider_user ON rider_user.user_id = rider.user_id
      JOIN users receiver ON receiver.user_id = handover.received_by_user_id
      ORDER BY handover.handover_date DESC, handover.handover_id
    `,
  boxInspectionLog: `
      SELECT inspection.*, city.city_name, inspector.full_name AS inspected_by_name
      FROM box_inspections inspection
      JOIN cities city ON city.city_id = inspection.city_id
      JOIN users inspector ON inspector.user_id = inspection.inspected_by_user_id
      ORDER BY inspection.inspection_date DESC, inspection.inspection_id
    `,
  boxStatusHistory: `
      SELECT history.*, box.city_id, city.city_name, actor.full_name AS changed_by_name
      FROM box_status_history history
      JOIN donation_boxes box ON box.box_id = history.box_id
      JOIN cities city ON city.city_id = box.city_id
      JOIN users actor ON actor.user_id = history.changed_by_user_id
      ORDER BY history.changed_on DESC, history.history_id
    `,
  securityIncidents: `
      SELECT incident.*, city.city_name, reporter.full_name AS reported_by_name
      FROM security_incidents incident
      JOIN cities city ON city.city_id = incident.city_id
      JOIN users reporter ON reporter.user_id = incident.reported_by_user_id
      ORDER BY incident.incident_date DESC, incident.incident_id
    `,
  operationalCosts: `
      SELECT cost.*, city.city_name
      FROM operational_costs cost JOIN cities city USING (city_id)
      ORDER BY cost.month DESC, city.city_name, cost.cost_record_id
    `,
} as const;

type DashboardData = {
  cities: CityOption[];
  partners: DashboardRecord[];
  users: DashboardRecord[];
  riders: DashboardRecord[];
  donationBoxes: DashboardRecord[];
  collections: DashboardRecord[];
  riderTasks: DashboardRecord[];
  fieldCollectionLog: DashboardRecord[];
  cashHandoverDeposit: DashboardRecord[];
  boxInspectionLog: DashboardRecord[];
  boxStatusHistory: DashboardRecord[];
  securityIncidents: DashboardRecord[];
  operationalCosts: DashboardRecord[];
};

type DatasetKey = keyof DashboardData;
const allDatasetKeys = Object.keys(dashboardQueries) as DatasetKey[];

export async function getDashboardRecords<const Keys extends readonly DatasetKey[]>(keys: Keys): Promise<Pick<DashboardData, Keys[number]>> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 10, expire: 60 });
  cacheTag(DASHBOARD_DATA_CACHE_TAG);
  const rows = await Promise.all(keys.map((key) => readRows(dashboardQueries[key])));
  return Object.fromEntries(keys.map((key, index) => [
    key,
    key === "cities" ? rows[index] as CityOption[] : rows[index],
  ])) as Pick<DashboardData, Keys[number]>;
}

export async function getAllRecords(): Promise<DashboardData> {
  return getDashboardRecords(allDatasetKeys) as Promise<DashboardData>;
}

export type CollectionExplorerOptions = {
  page?: number;
  search?: string;
  status?: string;
  city?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: string;
};

export async function getCollectionExplorerPage(options: CollectionExplorerOptions = {}) {
  const page = Math.max(1, Math.min(100_000, Math.floor(Number(options.page) || 1)));
  const pageSize = 10;
  const values: (string | number)[] = [];
  const where: string[] = [];
  const add = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };
  const search = options.search?.trim().slice(0, 120);
  if (search) {
    const param = add(`%${search}%`);
    where.push(`CONCAT_WS(' ', collection.collection_id, collection.box_id, collection.city_id,
      city.city_name, partner.partner_name, rider_user.full_name, collection.collection_status,
      collection.verification_reference, collection.notes) ILIKE ${param}`);
  }
  if (options.status && options.status !== "all") where.push(`collection.collection_status = ${add(options.status)}`);
  if (options.city && options.city !== "all") where.push(`collection.city_id = ${add(options.city)}`);
  if (options.from && /^\d{4}-\d{2}-\d{2}$/.test(options.from)) where.push(`collection.collection_date >= ${add(options.from)}`);
  if (options.to && /^\d{4}-\d{2}-\d{2}$/.test(options.to)) where.push(`collection.collection_date <= ${add(options.to)}`);
  const filterSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sortColumns: Record<string, string> = {
    collection_id: "collection.collection_id",
    collection_date: "collection.collection_date",
    city_id: "city.city_name",
    collection_amount_pkr: "collection.collection_amount_pkr",
    collection_status: "collection.collection_status",
  };
  const sortSql = sortColumns[options.sort ?? ""] ?? "collection.collection_date";
  const directionSql = options.direction === "asc" ? "ASC" : "DESC";
  const limitParam = add(pageSize);
  const offsetParam = add((page - 1) * pageSize);
  const joins = `FROM collections collection
    JOIN cities city ON city.city_id = collection.city_id
    LEFT JOIN partners partner ON partner.partner_id = collection.partner_id
    JOIN riders rider ON rider.rider_id = collection.rider_id
    JOIN users rider_user ON rider_user.user_id = rider.user_id`;
  const [rows, countRows] = await Promise.all([
    readRows(`SELECT collection.*, city.city_name, partner.partner_name,
      rider_user.full_name AS rider_name, recorder.full_name AS recorded_by_name,
      counter.full_name AS counted_by_name, verifier.full_name AS verified_by_name,
      custodian.full_name AS custodian_name
      ${joins}
      LEFT JOIN users recorder ON recorder.user_id = collection.recorded_by_user_id
      LEFT JOIN users counter ON counter.user_id = collection.counted_by_user_id
      LEFT JOIN users verifier ON verifier.user_id = collection.verified_by_user_id
      LEFT JOIN users custodian ON custodian.user_id = collection.custodian_user_id
      ${filterSql}
      ORDER BY ${sortSql} ${directionSql}, collection.collection_id ${directionSql}
      LIMIT ${limitParam} OFFSET ${offsetParam}`, values),
    readRows(`SELECT COUNT(*)::int AS total ${joins} ${filterSql}`, values.slice(0, values.length - 2)),
  ]);
  return { records: rows, totalRecords: Number(countRows[0]?.total || 0), page, pageSize };
}

export async function getFieldCollectionExplorerPage(options: CollectionExplorerOptions = {}) {
  const page = Math.max(1, Math.min(100_000, Math.floor(Number(options.page) || 1)));
  const pageSize = 10;
  const values: (string | number)[] = [];
  const where: string[] = [];
  const add = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };
  const search = options.search?.trim().slice(0, 120);
  if (search) {
    const param = add(`%${search}%`);
    where.push(`CONCAT_WS(' ', field.field_collection_id, field.box_id, field.city_id,
      city.city_name, partner.partner_name, rider_user.full_name, field.task_id,
      field.collection_status, field.remarks) ILIKE ${param}`);
  }
  if (options.status && options.status !== "all") where.push(`field.collection_status = ${add(options.status)}`);
  if (options.city && options.city !== "all") where.push(`field.city_id = ${add(options.city)}`);
  if (options.from && /^\d{4}-\d{2}-\d{2}$/.test(options.from)) where.push(`field.collection_date >= ${add(options.from)}`);
  if (options.to && /^\d{4}-\d{2}-\d{2}$/.test(options.to)) where.push(`field.collection_date <= ${add(options.to)}`);
  const filterSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sortColumns: Record<string, string> = {
    field_collection_id: "field.field_collection_id",
    collection_date: "field.collection_date",
    city_id: "city.city_name",
    total_cash_counted_pkr: "field.total_cash_counted_pkr",
    collection_status: "field.collection_status",
  };
  const sortSql = sortColumns[options.sort ?? ""] ?? "field.collection_date";
  const directionSql = options.direction === "asc" ? "ASC" : "DESC";
  const limitParam = add(pageSize);
  const offsetParam = add((page - 1) * pageSize);
  const joins = `FROM field_collection_logs field
    JOIN cities city ON city.city_id = field.city_id
    LEFT JOIN partners partner ON partner.partner_id = field.partner_id
    JOIN riders rider ON rider.rider_id = field.rider_id
    JOIN users rider_user ON rider_user.user_id = rider.user_id`;
  const [rows, countRows] = await Promise.all([
    readRows(`SELECT field.*, city.city_name, partner.partner_name,
      rider_user.full_name AS rider_name, custodian.full_name AS custodian_name,
      counter.full_name AS counted_by_name, verifier.full_name AS verified_by_name
      ${joins}
      LEFT JOIN users custodian ON custodian.user_id = field.custodian_user_id
      LEFT JOIN users counter ON counter.user_id = field.counted_by_user_id
      LEFT JOIN users verifier ON verifier.user_id = field.verified_by_user_id
      ${filterSql}
      ORDER BY ${sortSql} ${directionSql}, field.field_collection_id ${directionSql}
      LIMIT ${limitParam} OFFSET ${offsetParam}`, values),
    readRows(`SELECT COUNT(*)::int AS total ${joins} ${filterSql}`, values.slice(0, values.length - 2)),
  ]);
  return { records: rows, totalRecords: Number(countRows[0]?.total || 0), page, pageSize };
}

export async function getCollectionsPageData() {
  "use cache";
  cacheLife({ stale: 5, revalidate: 10, expire: 60 });
  cacheTag(DASHBOARD_DATA_CACHE_TAG);
  const [records, fieldCollectionRecords, auxiliary, summaryRows, statusRows, monthlyRows, cityRows] = await Promise.all([
    getCollectionExplorerPage({ page: 1, sort: "collection_date", direction: "desc" }),
    getFieldCollectionExplorerPage({ page: 1, sort: "collection_date", direction: "desc" }),
    getDashboardRecords(["cities"] as const),
    readRows(`SELECT COUNT(*)::int AS total_records,
      COUNT(*) FILTER (WHERE collection_status = 'Verified')::int AS verified_count,
      COUNT(*) FILTER (WHERE collection_status = 'Pending Verification')::int AS pending_count,
      COUNT(*) FILTER (WHERE collection_status = 'Flagged')::int AS flagged_count,
      COALESCE(SUM(collection_amount_pkr) FILTER (WHERE collection_status = 'Verified'), 0) AS verified_total
      FROM collections`),
    readRows(`SELECT collection_status AS name, COUNT(*)::int AS value
      FROM collections GROUP BY collection_status ORDER BY collection_status`),
    readRows(`SELECT TO_CHAR(collection_date, 'YYYY-MM') AS month,
      SUM(collection_amount_pkr) AS collections FROM collections
      WHERE collection_status = 'Verified' GROUP BY TO_CHAR(collection_date, 'YYYY-MM') ORDER BY month`),
    readRows(`SELECT city.city_name AS name, COALESCE(SUM(collection.collection_amount_pkr), 0) AS value
      FROM cities city LEFT JOIN collections collection
        ON collection.city_id = city.city_id AND collection.collection_status = 'Verified'
      GROUP BY city.city_id, city.city_name ORDER BY value DESC`),
  ]);
  const summary = summaryRows[0] ?? {};
  const statusColors: Record<string, string> = {
    Verified: "#276431",
    "Pending Verification": "#d99a38",
    Flagged: "#b94b42",
  };
  return {
    ...auxiliary,
    records,
    fieldCollectionRecords,
    summary: {
      totalRecords: Number(summary.total_records || 0),
      verifiedCount: Number(summary.verified_count || 0),
      pendingCount: Number(summary.pending_count || 0),
      flaggedCount: Number(summary.flagged_count || 0),
      verifiedTotal: Number(summary.verified_total || 0),
    },
    statuses: statusRows.map((item) => ({ name: String(item.name), value: Number(item.value), color: statusColors[String(item.name)] || "#9aa69a" })),
    monthly: monthlyRows.map((item) => ({
      month: String(item.month),
      label: new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString("en-PK", { month: "short", year: "2-digit", timeZone: "UTC" }),
      collections: Number(item.collections || 0),
    })),
    cityTotals: cityRows.map((item) => ({ name: String(item.name), value: Number(item.value || 0) })),
  };
}

export function getCityName(cityId: string, cities: CityOption[]): string {
  return cities.find((city) => city.city_id === cityId)?.city_name || "Unassigned";
}

function getRangeBounds(minDate: string | null, maxDate: string | null, range = "30") {
  if (!minDate || !maxDate) {
    const today = new Date().toISOString().slice(0, 10);
    return { startDate: today, endDate: today };
  }
  const selectedRange = ["7", "30", "90", "all"].includes(String(range)) ? String(range) : "30";
  const start = new Date(`${maxDate}T00:00:00Z`);
  if (selectedRange === "all") start.setTime(new Date(`${minDate}T00:00:00Z`).getTime());
  else start.setUTCDate(start.getUTCDate() - Number(selectedRange) + 1);
  const firstAvailable = new Date(`${minDate}T00:00:00Z`);
  if (start < firstAvailable) start.setTime(firstAvailable.getTime());
  return { startDate: start.toISOString().slice(0, 10), endDate: maxDate };
}

export async function getOverviewData(
  { range = "30", city = "all" }: { range?: string; city?: string } = {},
) {
  "use cache";
  cacheLife({ stale: 5, revalidate: 10, expire: 60 });
  cacheTag(DASHBOARD_DATA_CACHE_TAG);
  range = ["7", "30", "90", "all"].includes(String(range)) ? String(range) : "30";
  const pool = getDatabasePool();
  const [cityRows, dateRows] = await Promise.all([
    readRows(dashboardQueries.cities),
    pool.query<{ min_date: string | null; max_date: string | null }>("SELECT MIN(collection_date)::text AS min_date, MAX(collection_date)::text AS max_date FROM collections"),
  ]);
  const cities = cityRows as CityOption[];
  city = cities.some((item) => item.city_id === city) ? city : "all";
  const { startDate, endDate } = getRangeBounds(dateRows.rows[0]?.min_date ?? null, dateRows.rows[0]?.max_date ?? null, range);
  const parameters = [startDate, endDate, city];
  const [summaryRows, dailyRows, cityTotalsRows, boxRows, taskRows, recentRows, activityRows] = await Promise.all([
    readRows(`SELECT COUNT(*)::int AS records,
      COUNT(*) FILTER (WHERE collection_status = 'Verified')::int AS verified_count,
      COUNT(*) FILTER (WHERE collection_status = 'Pending Verification')::int AS pending_count,
      COUNT(*) FILTER (WHERE collection_status = 'Flagged')::int AS flagged_count,
      COALESCE(SUM(collection_amount_pkr) FILTER (WHERE collection_status = 'Verified'), 0) AS verified_pkr,
      COALESCE(SUM(collection_amount_pkr) FILTER (WHERE collection_status = 'Pending Verification'), 0) AS pending_pkr
      FROM collections WHERE collection_date BETWEEN $1 AND $2 AND ($3 = 'all' OR city_id = $3)`, parameters),
    readRows(`SELECT collection_date::text AS date, SUM(collection_amount_pkr) AS collections
      FROM collections WHERE collection_status = 'Verified' AND collection_date BETWEEN $1 AND $2
      AND ($3 = 'all' OR city_id = $3) GROUP BY collection_date ORDER BY collection_date`, parameters),
    readRows(`SELECT city_id, SUM(collection_amount_pkr) AS collection FROM collections
      WHERE collection_status = 'Verified' AND collection_date BETWEEN $1 AND $2
      AND ($3 = 'all' OR city_id = $3) GROUP BY city_id`, parameters),
    readRows(`SELECT COUNT(*)::int AS boxes,
      COUNT(*) FILTER (WHERE box_status = 'Active')::int AS active_boxes,
      COUNT(*) FILTER (WHERE box_status IN ('Damaged', 'Under Review'))::int AS needs_attention_boxes
      FROM donation_boxes WHERE ($1 = 'all' OR city_id = $1)`, [city]),
    readRows(`SELECT COUNT(*)::int AS tasks,
      COUNT(*) FILTER (WHERE task_status = 'Completed')::int AS completed_tasks
      FROM rider_tasks task JOIN donation_boxes box ON box.box_id = task.box_id
      WHERE ($1 = 'all' OR box.city_id = $1)`, [city]),
    readRows(`WITH recent_ids AS (
      SELECT collection_id FROM collections
      WHERE collection_date BETWEEN $1 AND $2 AND ($3 = 'all' OR city_id = $3)
      ORDER BY collection_date DESC, collection_id LIMIT 8
      )
      SELECT collection.*, city.city_name, partner.partner_name,
      rider_user.full_name AS rider_name, recorder.full_name AS recorded_by_name,
      counter.full_name AS counted_by_name, verifier.full_name AS verified_by_name,
      custodian.full_name AS custodian_name
      FROM recent_ids recent JOIN collections collection USING (collection_id)
      JOIN cities city ON city.city_id = collection.city_id
      LEFT JOIN partners partner ON partner.partner_id = collection.partner_id
      JOIN riders rider ON rider.rider_id = collection.rider_id
      JOIN users rider_user ON rider_user.user_id = rider.user_id
      JOIN users recorder ON recorder.user_id = collection.recorded_by_user_id
      LEFT JOIN users counter ON counter.user_id = collection.counted_by_user_id
      LEFT JOIN users verifier ON verifier.user_id = collection.verified_by_user_id
      LEFT JOIN users custodian ON custodian.user_id = collection.custodian_user_id
      ORDER BY collection.collection_date DESC, collection.collection_id LIMIT 8`, parameters),
    readRows(`SELECT * FROM (
      SELECT ('collection-' || collection.collection_id) AS id, collection.city_id,
        collection.collection_date::text AS date,
        collection.collection_status || ' collection recorded' AS title,
        collection.collection_id || ' · ' || city.city_name || ' · Rs ' || TO_CHAR(collection.collection_amount_pkr, 'FM999,999,999,990') AS detail,
        'wallet' AS icon,
        CASE collection.collection_status WHEN 'Verified' THEN 'green' WHEN 'Flagged' THEN 'red' ELSE 'orange' END AS tone
      FROM collections collection JOIN cities city ON city.city_id = collection.city_id
      WHERE collection.collection_date BETWEEN $1 AND $2 AND ($3 = 'all' OR collection.city_id = $3)
      UNION ALL
      SELECT ('incident-' || incident.incident_id), incident.city_id, incident.incident_date::text,
        incident.severity || ' security incident ' || LOWER(incident.incident_status),
        incident.incident_type || ' · ' || city.city_name || ' · ' || incident.box_id,
        'shield', CASE WHEN incident.incident_status = 'Resolved' THEN 'green' ELSE 'orange' END
      FROM security_incidents incident JOIN cities city ON city.city_id = incident.city_id
      WHERE incident.incident_date <= $2 AND ($3 = 'all' OR incident.city_id = $3)
      UNION ALL
      SELECT ('inspection-' || inspection.inspection_id), inspection.city_id, inspection.inspection_date::text,
        'Box inspection needs follow-up', inspection.box_id || ' · ' || inspection.box_condition || ' · ' || city.city_name,
        'box', 'blue'
      FROM box_inspections inspection JOIN cities city ON city.city_id = inspection.city_id
      WHERE inspection.follow_up_required = 'Yes' AND inspection.inspection_date <= $2
        AND ($3 = 'all' OR inspection.city_id = $3)
    ) activity ORDER BY date DESC LIMIT 6`, parameters),
  ]);
  const summary = summaryRows[0] ?? {};
  const boxes = boxRows[0] ?? {};
  const tasks = taskRows[0] ?? {};
  const dailyTotals = new Map(dailyRows.map((record) => [String(record.date), Number(record.collections || 0)]));

  const chartData = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    chartData.push({ date, label: date.slice(5), collections: dailyTotals.get(date) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const statusCounts = [
    { name: "Verified", value: Number(summary.verified_count || 0) },
    { name: "Pending Verification", value: Number(summary.pending_count || 0) },
    { name: "Flagged", value: Number(summary.flagged_count || 0) },
  ];

  return {
    range, city, startDate, endDate, cities,
    totals: {
      verifiedPKR: Number(summary.verified_pkr || 0),
      pendingPKR: Number(summary.pending_pkr || 0),
      records: Number(summary.records || 0),
      pendingCount: Number(summary.pending_count || 0),
      flaggedCount: Number(summary.flagged_count || 0),
      boxes: Number(boxes.boxes || 0),
      activeBoxes: Number(boxes.active_boxes || 0),
      needsAttentionBoxes: Number(boxes.needs_attention_boxes || 0),
      tasks: Number(tasks.tasks || 0),
      completedTasks: Number(tasks.completed_tasks || 0),
    },
    chartData,
    cityData: cities.filter((item) => city === "all" || item.city_id === city)
      .map((item) => ({ name: item.city_name, collection: Number(cityTotalsRows.find((record) => record.city_id === item.city_id)?.collection || 0) }))
      .sort((a, b) => b.collection - a.collection),
    statusCounts,
    activity: activityRows,
    recentCollections: recentRows,
  };
}

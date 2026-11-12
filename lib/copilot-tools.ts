import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { getMonthlyReports } from "@/lib/monthly-reports";
import type { UserSession } from "@/lib/session";

const periodSchema = z.object({
  year: z.string().regex(/^(all|20\d{2})$/).default("all"),
});

const analyticsSchema = periodSchema.extend({
  city: z.string().optional(),
  analysis: z.enum([
    "collections_over_time",
    "collections_by_city",
    "collections_by_channel",
    "expenses_by_category",
    "tasks_by_status",
    "boxes_by_status",
    "handover_reconciliation",
  ]),
});

const recordsSchema = z.object({
  dataset: z.enum(["collections", "boxes", "tasks", "handovers", "inspections", "incidents", "costs"]),
  city: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

async function cityIdForName(cityName: string): Promise<string | null> {
  const result = await getDatabasePool().query<{ city_id: string }>(
    `SELECT city_id FROM cities WHERE LOWER(city_name) = LOWER($1) LIMIT 1`,
    [cityName.trim()],
  );
  return result.rows[0]?.city_id ?? null;
}

async function resolveCityScope(session: UserSession, requestedCity?: string) {
  if (session.role === "rider") {
    return { allowed: false as const, message: "Riders can only ask about their own assigned work and collections." };
  }
  if (session.role !== "super_admin" && !session.cityId) {
    return { allowed: false as const, message: "Your account has no assigned city, so city analytics are unavailable." };
  }
  const requestedId = requestedCity ? await cityIdForName(requestedCity) : null;
  if (requestedCity && !requestedId) {
    return { allowed: false as const, message: `I could not find a city named ${requestedCity}.` };
  }
  if (session.role !== "super_admin" && requestedId && requestedId !== session.cityId) {
    return { allowed: false as const, message: "You can only view analytics for your assigned city." };
  }
  return { allowed: true as const, cityId: session.role === "super_admin" ? requestedId : session.cityId, network: session.role === "super_admin" && !requestedId };
}

export function createCopilotTools(session: UserSession) {
  return {
    get_riders: tool({
      description: "List riders visible to the signed-in user. City Admins and Branch Admins are restricted to their assigned city. Riders cannot use this tool.",
      inputSchema: z.object({ city: z.string().optional(), includeInactive: z.boolean().default(false) }),
      execute: async ({ city, includeInactive }) => {
        const scope = await resolveCityScope(session, city);
        if (!scope.allowed) return { kind: "access_denied", message: scope.message };
        const parameters: unknown[] = [];
        const filters: string[] = [
          "tm.identity_type = 'login_account'",
          "tm.deleted_at IS NULL",
          "role.role_key IN ('rider')",
        ];
        if (!scope.network) {
          parameters.push(scope.cityId);
          filters.push(`tm.city_id = $${parameters.length}`);
        }
        if (!includeInactive) filters.push("tm.account_status = 'active'", "rider.employment_status = 'Active'");
        const result = await getDatabasePool().query(`
          SELECT tm.team_id, tm.full_name, tm.email, tm.phone, tm.account_status,
            rider.employment_status, rider.assigned_zone, city.city_name
          FROM team_members tm
          JOIN roles role ON role.role_id = tm.role_id
          JOIN riders rider ON rider.team_id = tm.team_id
          LEFT JOIN cities city ON city.city_id = tm.city_id
          WHERE ${filters.join(" AND ")}
          ORDER BY city.city_name, tm.full_name
          LIMIT 500
        `, parameters);
        return {
          kind: "table",
          title: "Riders",
          columns: ["Name", "City", "Zone", "Employment status", "Account status"],
          rows: result.rows.map((row) => [row.full_name, row.city_name, row.assigned_zone, row.employment_status, row.account_status]),
          total: result.rowCount ?? 0,
          source: "team_members, riders, roles, cities",
        };
      },
    }),
    get_city_summary: tool({
      description: "Return reported monthly collection, expense, box snapshot, and staff summary. Super Admin can query the network or a city; other admin roles can query only their assigned city; riders are denied.",
      inputSchema: periodSchema.extend({ city: z.string().optional(), channel: z.enum(["all", "public", "branch"]).default("all") }),
      execute: async ({ year, city, channel }) => {
        const scope = await resolveCityScope(session, city);
        if (!scope.allowed) return { kind: "access_denied", message: scope.message };
        const data = await getMonthlyReports({ year, city: scope.network ? (city ? (await cityIdForName(city)) ?? undefined : undefined) : scope.cityId ?? undefined, channel }, { cityId: scope.cityId, network: scope.network });
        return {
          kind: "summary",
          title: city ? `${city} reported summary` : "Network reported summary",
          period: year === "all" ? "All available years" : year,
          totals: data.totals,
          monthly: data.monthly,
          byCity: data.byCity,
          categories: data.categories,
          visuals: {
            trend: data.monthly.length > 1 ? { type: "line", title: "Monthly collection trend", xLabel: "Month", yLabel: "PKR collected", seriesLabel: "Total collections" } : null,
            channels: data.monthly.some((row) => Number(row.public) > 0 || Number(row.branch) > 0) ? { type: "line", title: "Public vs branch collections", xLabel: "Month", yLabel: "PKR collected" } : null,
            cities: data.byCity.length > 1 ? { type: "bar", title: "Collections by city", xLabel: "City", yLabel: "PKR collected" } : null,
            expenses: data.categories.length > 1 ? { type: "donut", title: "Expenses by category", label: "PKR expenses" } : null,
          },
          source: data.source,
          limitations: [
            "Monthly workbook totals are source reports, not individual rider collections.",
            "Box counts and staff counts are latest-month snapshots, not sums across months.",
          ],
        };
      },
    }),
    get_analytics: tool({
      description: "Create a read-only, role-filtered analytics result for a chart. Use collections_over_time for trends, collections_by_city for comparisons, collections_by_channel for public versus branch, expenses_by_category for composition, tasks_by_status for workflow status, boxes_by_status for network inventory, and handover_reconciliation for declared versus received cash. The result includes chart labels and units.",
      inputSchema: analyticsSchema,
      execute: async ({ year, city, analysis }) => {
        const scope = await resolveCityScope(session, city);
        if (!scope.allowed) return { kind: "access_denied", message: scope.message };
        const reportData = await getMonthlyReports({ year, city: scope.network ? (city ? (await cityIdForName(city)) ?? undefined : undefined) : scope.cityId ?? undefined }, { cityId: scope.cityId, network: scope.network });
        if (analysis === "collections_over_time") return { kind: "chart", chartType: "line", title: "Collections over time", xLabel: "Month", yLabel: "PKR collected", unit: "PKR", data: reportData.monthly.map((row) => ({ name: row.month, value: row.collections ?? 0 })), period: year === "all" ? "All available years" : year, source: reportData.source };
        if (analysis === "collections_by_city") return { kind: "chart", chartType: "bar", title: "Collections by city", xLabel: "City", yLabel: "PKR collected", unit: "PKR", data: reportData.byCity.map((row) => ({ name: row.name, value: row.value ?? 0 })), period: year === "all" ? "All available years" : year, source: reportData.source };
        if (analysis === "collections_by_channel") return { kind: "chart", chartType: "channel_line", title: "Public versus branch collections", xLabel: "Month", yLabel: "PKR collected", unit: "PKR", data: reportData.monthly.map((row) => ({ name: row.month, public: row.public ?? 0, branch: row.branch ?? 0 })), period: year === "all" ? "All available years" : year, source: reportData.source };
        if (analysis === "expenses_by_category") return { kind: "chart", chartType: "donut", title: "Expenses by category", label: "PKR expenses", unit: "PKR", data: reportData.categories.map((row) => ({ name: row.name, value: row.value ?? 0 })), period: year === "all" ? "All available years" : year, source: reportData.source };

        const parameters: unknown[] = [];
        const cityFilter = scope.network ? "TRUE" : (parameters.push(scope.cityId), `city.city_id = $${parameters.length}`);
        if (analysis === "tasks_by_status") {
          const result = await getDatabasePool().query(`SELECT task.task_status AS name, COUNT(*)::int AS value FROM rider_tasks task JOIN donation_boxes box ON box.box_id=task.box_id JOIN cities city ON city.city_id=box.city_id WHERE ${cityFilter} GROUP BY task.task_status ORDER BY value DESC`, parameters);
          return { kind: "chart", chartType: "donut", title: "Tasks by status", label: "Tasks", unit: "tasks", data: result.rows, source: "rider_tasks, donation_boxes, cities" };
        }
        if (analysis === "boxes_by_status") {
          const result = await getDatabasePool().query(`SELECT box.box_status AS name, COUNT(*)::int AS value FROM donation_boxes box JOIN cities city ON city.city_id=box.city_id WHERE ${cityFilter} GROUP BY box.box_status ORDER BY value DESC`, parameters);
          return { kind: "chart", chartType: "donut", title: "Donation boxes by status", label: "Boxes", unit: "boxes", data: result.rows, source: "donation_boxes, cities" };
        }
        const result = await getDatabasePool().query(`SELECT handover_status AS name, COALESCE(SUM(difference_pkr),0)::float8 AS value FROM cash_handover_deposits handover JOIN cities city ON city.city_id=handover.city_id WHERE ${cityFilter} GROUP BY handover_status ORDER BY value DESC`, parameters);
        return { kind: "chart", chartType: "bar", title: "Cash reconciliation difference by handover status", xLabel: "Handover status", yLabel: "PKR difference", unit: "PKR", data: result.rows, source: "cash_handover_deposits, cities" };
      },
    }),
    get_records: tool({
      description: "Read permitted operational records as a table. Use this for detailed collections, boxes, tasks, handovers, inspections, security incidents, or operational costs. It never accepts raw SQL and always applies the signed-in user's city scope.",
      inputSchema: recordsSchema,
      execute: async ({ dataset, city, limit }) => {
        if (session.role === "rider") return { kind: "access_denied", message: "Rider accounts can only use their personal rider statistics tool." };
        const scope = await resolveCityScope(session, city);
        if (!scope.allowed) return { kind: "access_denied", message: scope.message };
        const parameters: unknown[] = [];
        const cityFilter = scope.network ? "TRUE" : (parameters.push(scope.cityId), `city.city_id = $${parameters.length}`);
        const limitParam = (parameters.push(limit), `$${parameters.length}`);
        const queries: Record<string, { sql: string; columns: string[]; source: string }> = {
          collections: { sql: `SELECT c.collection_id AS "Collection", TO_CHAR(c.collection_date,'YYYY-MM-DD') AS "Date", city.city_name AS "City", c.box_id AS "Box", rider_user.full_name AS "Rider", c.collection_amount_pkr::float8 AS "Amount PKR", c.collection_status AS "Status", c.cash_handover_status AS "Handover", c.deposit_status AS "Deposit" FROM collections c JOIN cities city ON city.city_id=c.city_id JOIN riders rider ON rider.rider_id=c.rider_id JOIN team_members rider_user ON rider_user.team_id=rider.team_id WHERE ${cityFilter} ORDER BY c.collection_date DESC LIMIT ${limitParam}`, columns: ["Collection", "Date", "City", "Box", "Rider", "Amount PKR", "Status", "Handover", "Deposit"], source: "collections, cities, riders, team_members" },
          boxes: { sql: `SELECT box.box_id AS "Box", city.city_name AS "City", box.area AS "Area", box.location_type AS "Location type", box.box_status AS "Status", rider_user.full_name AS "Assigned rider", box.last_verified_date AS "Last verified" FROM donation_boxes box JOIN cities city ON city.city_id=box.city_id LEFT JOIN riders rider ON rider.rider_id=box.assigned_rider_id LEFT JOIN team_members rider_user ON rider_user.team_id=rider.team_id WHERE ${cityFilter} ORDER BY city.city_name, box.area LIMIT ${limitParam}`, columns: ["Box", "City", "Area", "Location type", "Status", "Assigned rider", "Last verified"], source: "donation_boxes, cities, riders, team_members" },
          tasks: { sql: `SELECT task.task_id AS "Task", TO_CHAR(task.task_date,'YYYY-MM-DD') AS "Date", city.city_name AS "City", task.task_type AS "Type", task.task_status AS "Status", task.workflow_stage AS "Workflow stage", rider_user.full_name AS "Rider", task.box_id AS "Box" FROM rider_tasks task JOIN donation_boxes box ON box.box_id=task.box_id JOIN cities city ON city.city_id=box.city_id JOIN riders rider ON rider.rider_id=task.rider_id JOIN team_members rider_user ON rider_user.team_id=rider.team_id WHERE ${cityFilter} ORDER BY task.task_date DESC LIMIT ${limitParam}`, columns: ["Task", "Date", "City", "Type", "Status", "Workflow stage", "Rider", "Box"], source: "rider_tasks, donation_boxes, cities, riders, team_members" },
          handovers: { sql: `SELECT handover.handover_id AS "Handover", handover.handover_date AS "Date", city.city_name AS "City", rider_user.full_name AS "Rider", handover.amount_declared_pkr::float8 AS "Declared PKR", handover.amount_received_pkr::float8 AS "Received PKR", handover.difference_pkr::float8 AS "Difference PKR", handover.handover_status AS "Handover status", handover.deposit_status AS "Deposit status" FROM cash_handover_deposits handover JOIN cities city ON city.city_id=handover.city_id JOIN riders rider ON rider.rider_id=handover.from_rider_id JOIN team_members rider_user ON rider_user.team_id=rider.team_id WHERE ${cityFilter} ORDER BY handover.handover_date DESC LIMIT ${limitParam}`, columns: ["Handover", "Date", "City", "Rider", "Declared PKR", "Received PKR", "Difference PKR", "Handover status", "Deposit status"], source: "cash_handover_deposits, cities, riders, team_members" },
          inspections: { sql: `SELECT inspection.inspection_id AS "Inspection", inspection.inspection_date AS "Date", city.city_name AS "City", inspection.box_id AS "Box", inspection.box_condition AS "Box condition", inspection.lock_condition AS "Lock condition", inspection.follow_up_required AS "Follow-up" FROM box_inspections inspection JOIN cities city ON city.city_id=inspection.city_id WHERE ${cityFilter} ORDER BY inspection.inspection_date DESC LIMIT ${limitParam}`, columns: ["Inspection", "Date", "City", "Box", "Box condition", "Lock condition", "Follow-up"], source: "box_inspections, cities" },
          incidents: { sql: `SELECT incident.incident_id AS "Incident", incident.incident_date AS "Date", city.city_name AS "City", incident.box_id AS "Box", incident.incident_type AS "Type", incident.severity AS "Severity", incident.incident_status AS "Status" FROM security_incidents incident JOIN cities city ON city.city_id=incident.city_id WHERE ${cityFilter} ORDER BY incident.incident_date DESC LIMIT ${limitParam}`, columns: ["Incident", "Date", "City", "Box", "Type", "Severity", "Status"], source: "security_incidents, cities" },
          costs: { sql: `SELECT cost.cost_record_id AS "Record", cost.month AS "Month", city.city_name AS "City", cost.cost_category AS "Category", cost.cost_amount_pkr::float8 AS "Cost PKR", cost.notes AS "Notes" FROM operational_costs cost JOIN cities city ON city.city_id=cost.city_id WHERE ${cityFilter} ORDER BY cost.month DESC LIMIT ${limitParam}`, columns: ["Record", "Month", "City", "Category", "Cost PKR", "Notes"], source: "operational_costs, cities" },
        };
        const definition = queries[dataset];
        const result = await getDatabasePool().query(definition.sql, parameters);
        return { kind: "table", title: `${dataset[0].toUpperCase()}${dataset.slice(1)} records`, columns: definition.columns, rows: result.rows.map((row) => definition.columns.map((column) => row[column] ?? null)), total: result.rowCount ?? 0, source: definition.source, scope: scope.network ? "Network-wide" : `City: ${session.cityId}` };
      },
    }),
    get_my_stats: tool({
      description: "Return the signed-in rider's own tasks and collections. This is the only operational analytics tool available to a Rider.",
      inputSchema: periodSchema,
      execute: async ({ year }) => {
        if (session.role !== "rider") return { kind: "access_denied", message: "This personal tool is available to Rider accounts." };
        const parameters: unknown[] = [session.userId];
        const dateFilter = year === "all" ? "" : " AND EXTRACT(YEAR FROM c.collection_date)::text = $2";
        if (year !== "all") parameters.push(year);
        const result = await getDatabasePool().query(`
          SELECT COUNT(DISTINCT t.task_id)::int AS task_count,
            COUNT(DISTINCT t.task_id) FILTER (WHERE t.task_status = 'Completed')::int AS completed_tasks,
            COUNT(DISTINCT c.collection_id)::int AS collection_count,
            COALESCE(SUM(c.collection_amount_pkr), 0)::text AS collection_total
          FROM riders r
          LEFT JOIN rider_tasks t ON t.rider_id = r.rider_id
          LEFT JOIN collections c ON c.rider_id = r.rider_id${dateFilter}
          WHERE r.team_id = $1
        `, parameters);
        return {
          kind: "rider_summary",
          title: "My rider statistics",
          period: year === "all" ? "All available records" : year,
          totals: {
            tasks: Number(result.rows[0]?.task_count ?? 0),
            completedTasks: Number(result.rows[0]?.completed_tasks ?? 0),
            collections: Number(result.rows[0]?.collection_count ?? 0),
            collectionTotal: Number(result.rows[0]?.collection_total ?? 0),
          },
          source: "riders, rider_tasks, collections",
        };
      },
    }),
  };
}

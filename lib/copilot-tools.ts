import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { getMonthlyReports } from "@/lib/monthly-reports";
import type { UserSession } from "@/lib/session";

const periodSchema = z.object({
  year: z.string().regex(/^(all|20\d{2})$/).default("all"),
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
          source: data.source,
          limitations: [
            "Monthly workbook totals are source reports, not individual rider collections.",
            "Box counts and staff counts are latest-month snapshots, not sums across months.",
          ],
        };
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
        return { kind: "summary", title: "My rider statistics", period: year === "all" ? "All available records" : year, ...result.rows[0], source: "riders, rider_tasks, collections" };
      },
    }),
  };
}

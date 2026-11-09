import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import type { CityOption } from "@/lib/dashboard-types";

async function getSession() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) redirect("/sign-in");
  return session;
}

export async function getAdminSession() {
  const session = await getSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}

export async function getManagerSession() {
  const session = await getSession();
  if (session.role !== "city_manager") redirect("/dashboard");
  return session;
}

export async function getAdminCity() {
  const session = await getSession();
  if (session.role !== "admin" && session.role !== "city_manager") redirect("/dashboard");
  return session.cityId;
}

export async function getAdminRecords<const Keys extends readonly ("cities" | "partners" | "users" | "riders" | "donationBoxes" | "collections" | "riderTasks" | "fieldCollectionLog" | "cashHandoverDeposit" | "boxInspectionLog" | "boxStatusHistory" | "securityIncidents" | "operationalCosts")[]>(keys: Keys) {
  const cityId = await getAdminCity();
  if (!cityId) return { cityId, records: null };
  const data = await getDashboardRecords(keys);
  const records = Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (key === "cities") return [key, (value as CityOption[]).filter((city) => city.city_id === cityId)];
    return [key, (value as Array<{ city_id?: string | null }>).filter((record) => record.city_id === cityId)];
  })) as Pick<typeof data, Keys[number]>;
  return { cityId, records };
}

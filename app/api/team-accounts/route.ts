import { createTeamAccount, isActiveLoginAccount, listTeamAccounts, softDeleteTeamAccount, TeamAccountDeleteError, type TeamRole } from "@/lib/admin-accounts";
import { hashPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { getDatabasePool } from "@/lib/db";
import { cookies } from "next/headers";

const allowedRoles: Record<string, readonly TeamRole[]> = {
  super_admin: ["admin", "city_manager", "rider"],
  admin: ["city_manager", "rider"],
  city_manager: ["rider"],
};

async function getSession() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isActiveLoginAccount(session.userId)) return null;
  return session;
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !allowedRoles[session.role]) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Confirm the account you want to delete." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null || !("userId" in input) || typeof input.userId !== "string" || !("confirmedEmail" in input) || typeof input.confirmedEmail !== "string") {
    return Response.json({ error: "Enter the account ID and confirm its email address." }, { status: 400 });
  }
  try {
    await softDeleteTeamAccount({ userId: input.userId, confirmedEmail: input.confirmedEmail, actor: session });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TeamAccountDeleteError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not delete team account.", error);
    return Response.json({ error: "Could not delete this account. Check the server logs." }, { status: 503 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || !allowedRoles[session.role]) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  try {
    const accounts = await listTeamAccounts(session);
    return Response.json({ accounts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not list team accounts.", error);
    return Response.json({ error: "Team accounts are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !allowedRoles[session.role]) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null) {
    return Response.json({ error: "Enter the account details." }, { status: 400 });
  }
  const body = input as Record<string, unknown>;
  const { name, email, phone, password, role, cityId: requestedCity, assignedZone, accountStatus, employmentStatus } = body;
  if (typeof name !== "string" || typeof email !== "string" || typeof phone !== "string" || typeof password !== "string" || typeof role !== "string") {
    return Response.json({ error: "Enter the name, phone, email, password, and role." }, { status: 400 });
  }
  if (!allowedRoles[session.role].includes(role as TeamRole)) {
    return Response.json({ error: "You are not allowed to create this role." }, { status: 403 });
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  if (cleanName.length < 2 || cleanName.length > 120) {
    return Response.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const phoneDigits = cleanPhone.replace(/\D/g, "");
  if (cleanPhone.length > 32 || !/^\+?[\d\s().-]{6,31}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return Response.json({ error: "Enter a valid phone number (7–15 digits)." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 1024) {
    return Response.json({ error: "Passwords must be between 12 and 1024 characters." }, { status: 400 });
  }
  const cityId = session.role === "super_admin" || session.role === "admin"
    ? (typeof requestedCity === "string" ? requestedCity.trim() : "")
    : session.cityId ?? "";
  if (!cityId) return Response.json({ error: "Select or assign a city before creating this account." }, { status: 400 });
  const cityExists = await getDatabasePool().query("SELECT 1 FROM cities WHERE city_id = $1", [cityId]);
  if (cityExists.rowCount === 0) return Response.json({ error: "Choose a valid city." }, { status: 400 });
  if (typeof accountStatus !== "string" || !["active", "inactive", "suspended"].includes(accountStatus)) {
    return Response.json({ error: "Choose a valid account status." }, { status: 400 });
  }
  const zone = typeof assignedZone === "string" ? assignedZone.trim() : "";
  if (role === "rider" && (!zone || zone.length > 80 || !["Active", "Inactive"].includes(String(employmentStatus)))) {
    return Response.json({ error: "Enter a rider zone and choose Active or Inactive employment status." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const account = await createTeamAccount({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role: role as TeamRole,
      cityId,
      accountStatus: accountStatus as "active" | "inactive" | "suspended",
      assignedZone: role === "rider" ? zone : undefined,
      employmentStatus: role === "rider" ? employmentStatus as "Active" | "Inactive" : undefined,
    });
    return Response.json({ account }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Could not create team account.", error);
    return Response.json({ error: "Could not save the account. Check the server logs." }, { status: 503 });
  }
}

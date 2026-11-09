import { verifyPassword } from "@/lib/auth";
import { findLoginAccountByEmail } from "@/lib/admin-accounts";
import { createUserSession } from "@/lib/session";
import { cookies } from "next/headers";

const INVALID_ACCOUNT_PASSWORD_HASH =
  "c2FkcWEtZHVtbXktc2FsdA.cccwb47eD-Jfib7iVv2GQLJ72fpTk3TXpI_ciOydLV_3_7IEyybJPMU_cXwGF9-vS6EM-vyYdIomCLzNOOJf0g";

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    typeof credentials !== "object" ||
    credentials === null ||
    !("email" in credentials) ||
    !("password" in credentials) ||
    typeof credentials.email !== "string" ||
    typeof credentials.password !== "string" ||
    credentials.email.length > 254 ||
    credentials.password.length > 1024
  ) {
    return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const email = credentials.email.trim().toLowerCase();
    const databaseAdmin = await findLoginAccountByEmail(email);
    const validPassword = await verifyPassword(
      credentials.password,
      databaseAdmin?.passwordHash ?? INVALID_ACCOUNT_PASSWORD_HASH,
    );

    if (!databaseAdmin || !validPassword) {
      return Response.json(
        { error: "The email or password is incorrect." },
        { status: 401 },
      );
    }

    const session = createUserSession({
      userId: databaseAdmin.id,
      email: databaseAdmin.email,
      name: databaseAdmin.name,
      role: databaseAdmin.role,
      cityId: databaseAdmin.cityId,
    });
    const cookieStore = await cookies();
    cookieStore.set(session.name, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });

    return Response.json(
      { ok: true, redirectTo: databaseAdmin.role === "admin" ? "/dashboard/admin" : databaseAdmin.role === "city_manager" ? "/dashboard/manager" : databaseAdmin.role === "rider" ? "/dashboard/rider" : "/dashboard" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Database sign-in failed because of a server or database error.", error);
    return Response.json(
      { error: "Sign-in is temporarily unavailable. Check the database connection and session configuration." },
      { status: 503 },
    );
  }
}

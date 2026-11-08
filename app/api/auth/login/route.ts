import {
  getSuperAdminEmail,
  verifyAdminCredentials,
  verifyPassword,
} from "@/lib/auth";
import { findAdminByEmail } from "@/lib/admin-accounts";
import { createAdminSession } from "@/lib/session";
import { cookies } from "next/headers";

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
    const isSuperAdmin = email === getSuperAdminEmail();
    const databaseAdmin = isSuperAdmin ? null : await findAdminByEmail(email);
    const valid = isSuperAdmin
      ? await verifyAdminCredentials(email, credentials.password)
      : databaseAdmin
        ? await verifyPassword(credentials.password, databaseAdmin.passwordHash)
        : await verifyAdminCredentials("", credentials.password);

    if (!valid || (!isSuperAdmin && !databaseAdmin)) {
      return Response.json(
        { error: "The email or password is incorrect." },
        { status: 401 },
      );
    }

    const session = createAdminSession(
      email,
      isSuperAdmin ? "super_admin" : "admin",
      databaseAdmin?.id,
    );
    const cookieStore = await cookies();
    cookieStore.set(session.name, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });

    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Super-admin sign-in failed because of server configuration.", error);
    return Response.json(
      { error: "Sign-in is temporarily unavailable. Check the server configuration." },
      { status: 503 },
    );
  }
}

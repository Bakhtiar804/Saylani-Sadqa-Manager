import { withApiErrors } from '@/lib/api-errors';
import { createTeamAccount, isCurrentLoginSession } from "@/lib/admin-accounts";
import { hashPassword } from "@/lib/auth";
import { getDatabasePool } from "@/lib/db";
import { hasValidRequestOrigin } from "@/lib/operations-auth";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { cookies } from "next/headers";

type AdminInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  cityId: string;
};

function isAdminInput(value: unknown): value is AdminInput {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || !("email" in value) || !("phone" in value) || !("password" in value) || !("cityId" in value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.password === "string" &&
    typeof value.cityId === "string"
  );
}

async function handlePOST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyUserSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!session || !await isCurrentLoginSession(session) || session.role !== "super_admin") {
    return Response.json({ error: "Super-admin access is required." }, { status: 403 });
  }

  if (!hasValidRequestOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isAdminInput(input)) {
    return Response.json({ error: "Enter the City Admin name, phone, email, city, and password." }, { status: 400 });
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const cityId = input.cityId.trim();
  if (name.length < 2 || name.length > 120) {
    return Response.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone.length > 32 || !/^\+?[\d\s().-]{6,31}$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return Response.json({ error: "Enter a valid phone number (7–15 digits)." }, { status: 400 });
  }
  if (!cityId || cityId.length > 16) {
    return Response.json({ error: "Choose a valid city." }, { status: 400 });
  }
  if (!(await getDatabasePool().query('SELECT 1 FROM cities WHERE city_id=$1',[cityId])).rowCount) {
    return Response.json({ error: "Choose a valid city." }, { status: 400 });
  }
  if (input.password.length < 12 || input.password.length > 1024) {
    return Response.json(
      { error: "City Admin passwords must be at least 12 characters." },
      { status: 400 },
    );
  }
  try {
    const passwordHash = await hashPassword(input.password);
    const admin = await createTeamAccount({
      name,
      email,
      phone,
      passwordHash,
      role: "admin",
      cityId,
      accountStatus: "active",
    });

    return Response.json(
      { admin },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return Response.json(
        { error: "A City Admin with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Could not create City Admin account.", error);
    return Response.json(
      { error: "Could not save the City Admin account. Check the server logs." },
      { status: 503 },
    );
  }
}

export const POST = withApiErrors(handlePOST);

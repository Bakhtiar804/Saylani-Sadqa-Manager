import { createAdminAccount } from "@/lib/admin-accounts";
import { getSuperAdminEmail, hashPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "@/lib/session";
import { cookies } from "next/headers";

type AdminInput = {
  name: string;
  email: string;
  password: string;
};

function isAdminInput(value: unknown): value is AdminInput {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || !("email" in value) || !("password" in value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.password === "string"
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!session || session.role !== "super_admin") {
    return Response.json({ error: "Super-admin access is required." }, { status: 403 });
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

  if (!isAdminInput(input)) {
    return Response.json({ error: "Enter the admin name, email, and password." }, { status: 400 });
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 120) {
    return Response.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (input.password.length < 12 || input.password.length > 1024) {
    return Response.json(
      { error: "Admin passwords must be at least 12 characters." },
      { status: 400 },
    );
  }
  if (email === getSuperAdminEmail()) {
    return Response.json(
      { error: "That email belongs to the configured super-admin account." },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hashPassword(input.password);
    const admin = await createAdminAccount({
      name,
      email,
      passwordHash,
      createdBy: session.email,
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
        { error: "An admin with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Could not create admin account.", error);
    return Response.json(
      { error: "Could not save the admin account. Check the server logs." },
      { status: 503 },
    );
  }
}

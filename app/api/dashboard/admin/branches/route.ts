import { withApiErrors } from "@/lib/api-errors";
import { createCityBranch } from "@/lib/city-branches";
import { hasValidRequestOrigin } from "@/lib/operations-auth";
import { getOperationsSession } from "@/lib/operations-auth";

async function handlePOST(request: Request) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to create a branch." }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Only City Admins can create branches." }, { status: 403 });
  if (!session.cityId) return Response.json({ error: "Your account needs a city assignment." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Enter valid branch details." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return Response.json({ error: "Enter valid branch details." }, { status: 400 });
  }
  const body = input as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? (body[key] as string).trim() : "";
  const name = text("name");
  const code = text("code");
  const address = text("address");
  const contactPhone = text("contactPhone");
  const status = text("status");
  if (name.length < 2 || name.length > 120) {
    return Response.json({ error: "Branch name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (code.length > 40) return Response.json({ error: "Branch code can be at most 40 characters." }, { status: 400 });
  if (address.length > 2000) return Response.json({ error: "Address can be at most 2000 characters." }, { status: 400 });
  const phoneDigits = contactPhone.replace(/\D/g, "");
  if (contactPhone && (contactPhone.length > 32 || !/^\+?[\d\s().-]{7,32}$/.test(contactPhone) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
    return Response.json({ error: "Enter a valid branch phone number (7–15 digits)." }, { status: 400 });
  }
  if (!(["active", "inactive"] as const).includes(status as "active" | "inactive")) {
    return Response.json({ error: "Choose Active or Inactive branch status." }, { status: 400 });
  }

  try {
    const branch = await createCityBranch({
      cityId: session.cityId,
      name,
      code: code || null,
      address: address || null,
      contactPhone: contactPhone || null,
      status: status as "active" | "inactive",
      createdByTeamId: session.userId,
    });
    return Response.json({ branch }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "A branch with this name or code already exists in your city." }, { status: 409 });
    }
    console.error("Could not create City Admin branch.", error);
    return Response.json({ error: "Could not create the branch right now." }, { status: 503 });
  }
}

export const POST = withApiErrors(handlePOST);

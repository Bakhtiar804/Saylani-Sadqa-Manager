import { getOperationsSession } from "@/lib/operations-auth";
import { getRiderTaskNotifications } from "@/lib/rider-dashboard";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to view notifications." }, { status: 401, headers });
  if (session.role !== "rider") return Response.json({ error: "Rider access is required." }, { status: 403, headers });
  return Response.json(await getRiderTaskNotifications(session.userId), { headers });
}

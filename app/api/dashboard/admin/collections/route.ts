import { validateExplorerParams } from '@/lib/explorer-params';
import { withApiErrors } from '@/lib/api-errors';
import { cookies } from "next/headers";
import { getCollectionExplorerPage } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { isCurrentLoginSession } from "@/lib/admin-accounts";
import { getActiveTeamBranch } from "@/lib/city-branches";

async function handleGET(request: Request) {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) return Response.json({ error: "Sign in to view collections." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "city_manager") return Response.json({ error: "City operations access is required." }, { status: 403 });
  if (!session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
  const branch = session.role === 'city_manager' ? await getActiveTeamBranch(session.userId, session.cityId) : null;
  if (session.role === 'city_manager' && !branch) return Response.json({ error: "An active branch assignment is required." }, { status: 403 });

  const params = validateExplorerParams(new URL(request.url).searchParams);
  try {
    const data = await getCollectionExplorerPage({
      page: Number(params.get("page") ?? 1), search: params.get("search") ?? "",
      status: params.get("status") ?? "all", city: session.cityId, branchId: branch?.branchId,
      from: params.get("from") ?? "", to: params.get("to") ?? "",
      sort: params.get("sort") ?? "collection_date", direction: params.get("direction") ?? "desc",
    });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load the requested City Admin collection page.", error);
    return Response.json({ error: "Collections are temporarily unavailable." }, { status: 503 });
  }
}

export const GET = withApiErrors(handleGET);

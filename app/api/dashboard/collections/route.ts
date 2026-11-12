import { validateExplorerParams } from '@/lib/explorer-params';
import { withApiErrors } from '@/lib/api-errors';
import { cookies } from "next/headers";
import { getCollectionExplorerPage } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { isCurrentLoginSession } from "@/lib/admin-accounts";

async function handleGET(request: Request) {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) {
    return Response.json({ error: "Sign in to view collections." }, { status: 401 });
  }
  if (session.role === "admin") return Response.json({ error: "Use your city-scoped City Admin Dashboard." }, { status: 403 });
  if (session.role === "rider") return Response.json({ error: "Use your personal Rider Dashboard." }, { status: 403 });
  if (session.role === "city_manager" && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });

  const params = validateExplorerParams(new URL(request.url).searchParams);
  try {
    const data = await getCollectionExplorerPage({
      page: Number(params.get("page") ?? 1),
      search: params.get("search") ?? "",
      status: params.get("status") ?? "all",
      city: session.role === "city_manager" ? session.cityId! : params.get("city") ?? "all",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      sort: params.get("sort") ?? "collection_date",
      direction: params.get("direction") ?? "desc",
    });
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Could not load the requested collection page.", error);
    return Response.json({ error: "Collections are temporarily unavailable." }, { status: 503 });
  }
}

export const GET = withApiErrors(handleGET);

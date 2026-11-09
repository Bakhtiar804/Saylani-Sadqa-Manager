import { cookies } from "next/headers";
import { getFieldCollectionExplorerPage } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { isActiveLoginAccount } from "@/lib/admin-accounts";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isActiveLoginAccount(session.userId)) {
    return Response.json({ error: "Sign in to view field logs." }, { status: 401 });
  }
  if (session.role === "admin") return Response.json({ error: "Use your city-scoped Admin Dashboard." }, { status: 403 });
  if (session.role === "rider") return Response.json({ error: "Use your personal Rider Dashboard." }, { status: 403 });
  if (session.role === "city_manager" && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  try {
    const data = await getFieldCollectionExplorerPage({
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
    console.error("Could not load the requested field collection page.", error);
    return Response.json({ error: "Field collection records are temporarily unavailable." }, { status: 503 });
  }
}

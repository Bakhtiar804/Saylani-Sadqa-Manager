import { getCollectionExplorerPage } from "@/lib/dashboard-data";
import { getOperationsSession } from "@/lib/operations-auth";

export async function GET(request: Request) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to view collections." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "city_manager") return Response.json({ error: "City operations access is required." }, { status: 403 });
  if (!session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  try {
    const data = await getCollectionExplorerPage({
      page: Number(params.get("page") ?? 1), search: params.get("search") ?? "",
      status: params.get("status") ?? "all", city: session.cityId,
      from: params.get("from") ?? "", to: params.get("to") ?? "",
      sort: params.get("sort") ?? "collection_date", direction: params.get("direction") ?? "desc",
    });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load the requested Admin collection page.", error);
    return Response.json({ error: "Collections are temporarily unavailable." }, { status: 503 });
  }
}

import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";

const decisions = ["Verified", "Flagged"] as const;

async function handleGET(_request: Request, context: { params: Promise<{ collectionId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to view collection history." }, { status: 401 });
  if (!["super_admin", "admin", "city_manager"].includes(session.role)) return Response.json({ error: "Collection review access is required." }, { status: 403 });
  if (session.role !== "super_admin" && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
  const { collectionId } = await context.params;
  try {
    const result = await getDatabasePool().query<{
      audit_id: string | null; action: string | null; actor_name: string | null;
      occurred_at: Date | null; before_data: unknown; after_data: unknown;
    }>(`
      SELECT audit.audit_id, audit.action, actor.full_name AS actor_name,
        audit.occurred_at, audit.before_data, audit.after_data
      FROM collections collection
      LEFT JOIN activity_audit_log audit
        ON audit.entity_type = 'collection' AND audit.entity_id = collection.collection_id
      LEFT JOIN team_members actor ON actor.team_id = audit.actor_team_id
      WHERE collection.collection_id = $1
        AND ($2::boolean OR collection.city_id = $3)
      ORDER BY audit.occurred_at DESC NULLS LAST
    `, [collectionId, session.role === "super_admin", session.cityId]);
    if (result.rows.length === 0) return Response.json({ error: "This collection is not available in your scope." }, { status: 404 });
    const events = result.rows.filter((row) => row.audit_id).map((row) => ({
      id: row.audit_id, action: row.action, actorName: row.actor_name,
      occurredAt: row.occurred_at?.toISOString() ?? null,
      before: row.before_data, after: row.after_data,
    }));
    return Response.json({ events }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load collection audit history.", error);
    return Response.json({ error: "Collection history is temporarily unavailable." }, { status: 503 });
  }
}

async function handlePATCH(request: Request, context: { params: Promise<{ collectionId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to review collections." }, { status: 401 });
  if (!["admin", "city_manager"].includes(session.role)) return Response.json({ error: "Your role has read-only access to collections." }, { status: 403 });
  if (session.role !== "super_admin" && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { collectionId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Choose a review decision." }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("status" in body) || !decisions.includes(body.status as typeof decisions[number])) {
    return Response.json({ error: "Choose Mark recorded or Flag for review." }, { status: 400 });
  }
  const notes = "notes" in body && typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (body.status === "Flagged" && notes.length < 3) return Response.json({ error: "Add a short reason when flagging a collection." }, { status: 400 });

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query<{ collection_status: string; city_id: string }>(
      "SELECT collection_status, city_id FROM collections WHERE collection_id = $1 FOR UPDATE", [collectionId],
    );
    const current = currentResult.rows[0];
    if (!current || (session.role !== "super_admin" && current.city_id !== session.cityId)) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This collection is not available in your scope." }, { status: 404 });
    }
    if (current.collection_status === "Verified") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Recorded entries are locked to preserve audit history." }, { status: 409 });
    }

    const status = body.status as typeof decisions[number];
    await client.query(`
      UPDATE collections
      SET collection_status = $2::text, verified_by_team_id = $3, verified_at = CURRENT_TIMESTAMP,
          notes = CASE WHEN $4::text = '' THEN notes ELSE CONCAT_WS(CHR(10), notes, 'Review [' || CASE WHEN $2::text = 'Verified' THEN 'Recorded' ELSE 'Flagged' END || ']: ' || $4::text) END
      WHERE collection_id = $1
    `, [collectionId, status, session.userId, notes]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'collection', $2, 'reviewed', $3, $4::jsonb, $5::jsonb)
    `, [randomBytes(16).toString("hex"), collectionId, session.userId, JSON.stringify({ status: current.collection_status }), JSON.stringify({ status, notes })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ collectionId, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not review collection.", error);
    return Response.json({ error: "The collection could not be reviewed." }, { status: 503 });
  } finally { client.release(); }
}

export const GET = withApiErrors(handleGET);
export const PATCH = withApiErrors(handlePATCH);

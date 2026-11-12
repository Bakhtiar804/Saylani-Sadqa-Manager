import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getActiveTeamBranch } from "@/lib/city-branches";

import { parseBoxCoordinates } from '@/lib/box-coordinates';

function textField(body: Record<string, unknown>, key: string, max: number): string {
  return typeof body[key] === "string" ? body[key].trim().slice(0, max) : "";
}

async function handlePOST(request: Request) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to register a box." }, { status: 401 });
  if (!['admin', 'city_manager'].includes(session.role)) return Response.json({ error: "Your role cannot register donation boxes." }, { status: 403 });
  if (!session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Enter the box details." }, { status: 400 }); }
  if (typeof input !== "object" || input === null) return Response.json({ error: "Enter the box details." }, { status: 400 });
  const body = input as Record<string, unknown>;
  let coordinates;
  try { coordinates = parseBoxCoordinates(body); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  const qrCode = textField(body, "qrCode", 40).toUpperCase();
  const cityId = session.cityId!;
  const branch = session.role === 'city_manager' ? await getActiveTeamBranch(session.userId, cityId) : null;
  if (session.role === 'city_manager' && !branch) return Response.json({ error: "An active branch assignment is required." }, { status: 403 });
  const district = textField(body, "district", 100) || null;
  const area = textField(body, "area", 100);
  const locationType = textField(body, "locationType", 40);
  const locationDescription = textField(body, "locationDescription", 1000);
  const installationDate = textField(body, "installationDate", 10);
  const securityLevel = textField(body, "securityLevel", 32);
  const partnerId = textField(body, "partnerId", 16) || null;
  const custodianUserId = textField(body, "custodianUserId", 40) || null;
  const assignedRiderId = textField(body, "assignedRiderId", 16) || null;
  if (!/^[A-Z0-9-]{3,40}$/.test(qrCode)) return Response.json({ error: "Use letters, numbers, or hyphens for the QR code." }, { status: 400 });
  if (!cityId || !area || !locationType || !locationDescription || !securityLevel || !/^\d{4}-\d{2}-\d{2}$/.test(installationDate) || Number.isNaN(Date.parse(`${installationDate}T00:00:00Z`))) {
    return Response.json({ error: "Complete the city, location, installation date, and security fields." }, { status: 400 });
  }
  if (new Date(`${installationDate}T00:00:00Z`).toISOString().slice(0, 10) !== installationDate) {
    return Response.json({ error: "Enter a valid installation date." }, { status: 400 });
  }

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    // Serialize generated IDs without adding a sequence or altering database schema.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('donation-box-db-id-sequence'))");
    const nextId = await client.query<{ next_number: number }>(`
      SELECT COALESCE(MAX((substring(box_id from 4))::integer), 0) + 1 AS next_number
      FROM donation_boxes WHERE box_id ~ '^DB-[0-9]+$'
    `);
    const boxId = `DB-${String(nextId.rows[0]?.next_number ?? 1).padStart(4, '0')}`;
    const city = await client.query("SELECT 1 FROM cities WHERE city_id = $1", [cityId]);
    if (city.rowCount !== 1) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Choose a valid city." }, { status: 400 });
    }
    if (partnerId) {
      const partner = await client.query("SELECT 1 FROM partners WHERE partner_id = $1 AND city_id = $2", [partnerId, cityId]);
      if (partner.rowCount !== 1) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Choose a partner in the box's city." }, { status: 400 });
      }
    }
    if (custodianUserId) {
      const custodian = await client.query(`SELECT 1 FROM team_members member
        LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = member.team_id
        WHERE member.team_id = $1 AND member.identity_type = 'field_staff' AND member.city_id = $2
        AND ($3::text IS NULL OR COALESCE(member.branch_id, assignment.branch_id) = $3)`, [custodianUserId, cityId, branch?.branchId ?? null]);
      if (custodian.rowCount !== 1) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Choose a field custodian in the box's city." }, { status: 400 });
      }
    }
    if (assignedRiderId) {
      const rider = await client.query(`SELECT 1 FROM riders
        JOIN team_members member USING (team_id)
        LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = member.team_id
        WHERE riders.rider_id = $1 AND member.city_id = $2 AND member.account_status = 'active' AND member.deleted_at IS NULL
        AND ($3::text IS NULL OR COALESCE(member.branch_id, assignment.branch_id) = $3)`, [assignedRiderId, cityId, branch?.branchId ?? null]);
      if (rider.rowCount !== 1) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Choose an active rider in the box's city." }, { status: 400 });
      }
    }
    if (branch) {
      const validBranch = await client.query("SELECT 1 FROM branches WHERE branch_id = $1 AND city_id = $2 AND status = 'active'", [branch.branchId, cityId]);
      if (validBranch.rowCount !== 1) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Your active branch assignment could not be verified." }, { status: 403 });
      }
    }
    await client.query(`
      INSERT INTO donation_boxes (
        box_id, qr_code, city_id, area, location_type, location_description,
        custodian_team_id, partner_id, assigned_rider_id, installation_date,
        box_status, security_level, is_demo_record, district, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active', $11, FALSE, $12, $13, $14)
    `, [boxId, qrCode, cityId, area, locationType, locationDescription, custodianUserId, partnerId, assignedRiderId, installationDate, securityLevel, district, coordinates.latitude, coordinates.longitude]);
    if (branch) {
      await client.query(`
        INSERT INTO branch_box_assignments (box_id, city_id, branch_id, assigned_by_team_id)
        VALUES ($1, $2, $3, $4)
      `, [boxId, cityId, branch.branchId, session.userId]);
    }
    await client.query(`
      INSERT INTO box_status_history (history_id, box_id, previous_status, new_status, changed_on, changed_by_team_id, reason)
      VALUES ($1, $2, 'Not Registered', 'Active', CURRENT_DATE, $3, 'Initial registration')
    `, [randomBytes(8).toString("hex").toUpperCase(), boxId, session.userId]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'donation_box', $2, 'registered', $3, NULL, $4::jsonb)
    `, [randomBytes(16).toString("hex"), boxId, session.userId, JSON.stringify({ cityId, district, area, locationType, ...coordinates, boxStatus: "Active" })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ boxId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "That box ID or QR code is already registered." }, { status: 409 });
    }
    console.error("Could not register donation box.", error);
    return Response.json({ error: "The box could not be registered." }, { status: 503 });
  } finally { client.release(); }
}

export const POST = withApiErrors(handlePOST);

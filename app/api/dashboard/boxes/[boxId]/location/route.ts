import { randomBytes } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { withApiErrors } from '@/lib/api-errors';
import { getDatabasePool } from '@/lib/db';
import { getOperationsSession, hasValidRequestOrigin } from '@/lib/operations-auth';
import { getActiveTeamBranch } from '@/lib/city-branches';
import { parseBoxCoordinates } from '@/lib/box-coordinates';

async function handlePATCH(request: Request, context: { params: Promise<{ boxId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: 'Sign in to update box locations.' }, { status: 401 });
  const networkAccess = session.role === 'super_admin';
  if (!networkAccess && (!['admin', 'city_manager'].includes(session.role) || !session.cityId)) return Response.json({ error: 'Box location management access is required.' }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('latitude' in body) || !('longitude' in body)) return Response.json({ error: 'Provide latitude and longitude, or clear both to remove the location.' }, { status: 400 });
  let coordinates;
  try { coordinates = parseBoxCoordinates(body as Record<string, unknown>); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  const branch = session.role === 'city_manager' ? await getActiveTeamBranch(session.userId, session.cityId!) : null;
  if (session.role === 'city_manager' && !branch) return Response.json({ error: 'An active branch assignment is required.' }, { status: 403 });
  const { boxId } = await context.params;
  const client = await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(`SELECT box.latitude, box.longitude FROM donation_boxes box
      WHERE box.box_id=$1 AND ($4::boolean OR box.city_id=$2) AND ($3::text IS NULL OR EXISTS (
        SELECT 1 FROM branch_box_assignments assignment WHERE assignment.box_id=box.box_id
        AND assignment.city_id=box.city_id AND assignment.branch_id=$3)) FOR UPDATE OF box`, [boxId, session.cityId, branch?.branchId ?? null, networkAccess])).rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'This box is not available in your access scope.' }, { status: 404 });
    }
    await client.query('UPDATE donation_boxes SET latitude=$2, longitude=$3 WHERE box_id=$1', [boxId, coordinates.latitude, coordinates.longitude]);
    await client.query(`INSERT INTO activity_audit_log(audit_id,entity_type,entity_id,action,actor_team_id,before_data,after_data)
      VALUES($1,'donation_box',$2,'location_updated',$3,$4::jsonb,$5::jsonb)`, [randomBytes(16).toString('hex'), boxId, session.userId, JSON.stringify(current), JSON.stringify(coordinates)]);
    await client.query('COMMIT');
    revalidateTag('dashboard-db-records', { expire: 0 });
    return Response.json(coordinates, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
export const PATCH = withApiErrors(handlePATCH);

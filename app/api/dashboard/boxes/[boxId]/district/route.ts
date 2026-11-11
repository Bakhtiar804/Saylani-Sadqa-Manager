import { randomBytes } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { withApiErrors } from '@/lib/api-errors';
import { getDatabasePool } from '@/lib/db';
import { getOperationsSession,hasValidRequestOrigin } from '@/lib/operations-auth';
async function handlePATCH(request:Request,context:{params:Promise<{boxId:string}>}) {
 const session=await getOperationsSession();if(!session)return Response.json({error:'Sign in to update districts.'},{status:401});
 if(!['admin','city_manager'].includes(session.role)||!session.cityId)return Response.json({error:'City operations access is required.'},{status:403});
 if(!hasValidRequestOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.district!=='string'||body.district.trim().length<2||body.district.trim().length>100)return Response.json({error:'Enter a district name between 2 and 100 characters.'},{status:400});
 const district=body.district.trim().replace(/\s+/g,' ');const {boxId}=await context.params;const client=await getDatabasePool().connect();
 try {await client.query('BEGIN');const current=(await client.query<{district:string|null}>('SELECT district FROM donation_boxes WHERE box_id=$1 AND city_id=$2 FOR UPDATE',[boxId,session.cityId])).rows[0];
 if(!current){await client.query('ROLLBACK');return Response.json({error:'This box is not available in your city.'},{status:404});}
 await client.query('UPDATE donation_boxes SET district=$2 WHERE box_id=$1',[boxId,district]);
 await client.query("INSERT INTO activity_audit_log(audit_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) VALUES($1,'donation_box',$2,'district_assigned',$3,$4::jsonb,$5::jsonb)",[randomBytes(16).toString('hex'),boxId,session.userId,JSON.stringify({district:current.district}),JSON.stringify({district})]);
 await client.query('COMMIT');revalidateTag('dashboard-db-records',{expire:0});return Response.json({district},{headers:{'Cache-Control':'no-store'}});
 }catch(error){await client.query('ROLLBACK').catch(()=>undefined);throw error;}finally{client.release();}
}
export const PATCH=withApiErrors(handlePATCH);

import { withApiErrors } from '@/lib/api-errors';
import { getOperationsSession, hasValidRequestOrigin } from '@/lib/operations-auth';
import { getRiderTaskNotifications, markRiderTaskNotificationsRead } from '@/lib/rider-notifications';

export const GET=withApiErrors(async()=>{
  const session=await getOperationsSession();
  if(!session)return Response.json({error:'Sign in to view notifications.'},{status:401});
  if(session.role!=='rider')return Response.json({error:'Only Riders can access task notifications.'},{status:403});
  return Response.json(await getRiderTaskNotifications(session.userId));
});

export const PATCH=withApiErrors(async(request:Request)=>{
  const session=await getOperationsSession();
  if(!session)return Response.json({error:'Sign in to update notifications.'},{status:401});
  if(session.role!=='rider'||!hasValidRequestOrigin(request))return Response.json({error:'This action is not allowed.'},{status:403});
  let body:unknown;try{body=await request.json();}catch{return Response.json({error:'Choose task notifications.'},{status:400});}
  const ids=typeof body==='object'&&body!==null&&'taskIds' in body?body.taskIds:undefined;
  if(!Array.isArray(ids)||ids.length===0||ids.length>50||ids.some(id=>typeof id!=='string'||!id||id.length>20)||new Set(ids).size!==ids.length){
    return Response.json({error:'Choose up to 50 unique task notifications.'},{status:400});
  }
  if(!await markRiderTaskNotificationsRead(session.userId,ids))return Response.json({error:'These notifications are not assigned to you.'},{status:404});
  return Response.json({ok:true});
});

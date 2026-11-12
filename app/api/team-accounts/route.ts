import { withApiErrors } from '@/lib/api-errors';
import { createTeamAccount, updateTeamAccount, isCurrentLoginSession, listTeamAccounts, softDeleteTeamAccount, TeamAccountDeleteError, type TeamRole } from "@/lib/admin-accounts";
import { hashPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { getDatabasePool } from "@/lib/db";
import { hasValidRequestOrigin } from "@/lib/operations-auth";
import { getActiveTeamBranch } from "@/lib/city-branches";
import { cookies } from "next/headers";
import { creatableRoles, deletableRoles, editableRoles } from '@/lib/permissions';

const allowedRoles = creatableRoles;

async function getSession() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) return null;
  return session;
}

async function handleDELETE(request: Request) {
  const session = await getSession();
  if (!session || !deletableRoles[session.role].length) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  if (!hasValidRequestOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Confirm the account you want to delete." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null || !("userId" in input) || typeof input.userId !== "string" || !("confirmedEmail" in input) || typeof input.confirmedEmail !== "string") {
    return Response.json({ error: "Enter the account ID and confirm its email address." }, { status: 400 });
  }
  try {
    await softDeleteTeamAccount({ userId: input.userId, confirmedEmail: input.confirmedEmail, actor: session });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TeamAccountDeleteError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not delete team account.", error);
    return Response.json({ error: "Could not delete this account. Check the server logs." }, { status: 503 });
  }
}

async function handleGET() {
  const session = await getSession();
  if (!session || !allowedRoles[session.role].length) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  try {
    const accounts = await listTeamAccounts(session);
    return Response.json({ accounts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not list team accounts.", error);
    return Response.json({ error: "Team accounts are temporarily unavailable." }, { status: 503 });
  }
}

async function handlePOST(request: Request) {
  const session = await getSession();
  if (!session || !allowedRoles[session.role].length) {
    return Response.json({ error: "Team management access is required." }, { status: 403 });
  }
  if (!hasValidRequestOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null) {
    return Response.json({ error: "Enter the account details." }, { status: 400 });
  }
  const body = input as Record<string, unknown>;
  const { name, email, phone, password, role, cityId: requestedCity, assignedZone, accountStatus, employmentStatus, branchId: requestedBranch } = body;
  if (typeof name !== "string" || typeof email !== "string" || typeof phone !== "string" || typeof password !== "string" || typeof role !== "string") {
    return Response.json({ error: "Enter the name, phone, email, password, and role." }, { status: 400 });
  }
  if (!allowedRoles[session.role].includes(role as TeamRole)) {
    return Response.json({ error: "You are not allowed to create this role." }, { status: 403 });
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  if (cleanName.length < 2 || cleanName.length > 120) {
    return Response.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const phoneDigits = cleanPhone.replace(/\D/g, "");
  if (cleanPhone.length > 32 || !/^\+?[\d\s().-]{6,31}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return Response.json({ error: "Enter a valid phone number (7–15 digits)." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 1024) {
    return Response.json({ error: "Passwords must be between 12 and 1024 characters." }, { status: 400 });
  }
  const cityId = session.role === "super_admin"
    ? (typeof requestedCity === "string" ? requestedCity.trim() : "")
    : session.cityId ?? "";
  if (!cityId) return Response.json({ error: "Select or assign a city before creating this account." }, { status: 400 });
  const cityExists = await getDatabasePool().query("SELECT 1 FROM cities WHERE city_id = $1", [cityId]);
  if (cityExists.rowCount === 0) return Response.json({ error: "Choose a valid city." }, { status: 400 });
  if (typeof accountStatus !== "string" || !["active", "inactive", "suspended"].includes(accountStatus)) {
    return Response.json({ error: "Choose a valid account status." }, { status: 400 });
  }
  let branchId: string | undefined;
  let assignedBranch: string | undefined;
  if (role === "city_manager") {
    branchId = typeof requestedBranch === "string" ? requestedBranch.trim() : "";
    if (!branchId || branchId.length > 40) return Response.json({ error: "Choose an active branch for this Branch Admin." }, { status: 400 });
    const branchResult = await getDatabasePool().query<{ branch_name: string }>(
      "SELECT branch_name FROM branches WHERE branch_id = $1 AND city_id = $2 AND status = 'active' LIMIT 1",
      [branchId, cityId],
    );
    assignedBranch = branchResult.rows[0]?.branch_name;
    if (!assignedBranch) return Response.json({ error: "Choose an active branch in your assigned city." }, { status: 400 });
    if (assignedBranch.length > 120) return Response.json({ error: "This branch name is too long to save in the account's assigned branch field." }, { status: 400 });
  }
  if (role === "rider" && session.role === "city_manager") {
    const actorBranch = session.cityId ? await getActiveTeamBranch(session.userId, session.cityId) : null;
    if (!actorBranch) return Response.json({ error: "Your Branch Admin account needs an active branch assignment." }, { status: 403 });
    branchId = actorBranch.branchId;
    assignedBranch = actorBranch.branchName;
    if (assignedBranch.length > 120) return Response.json({ error: "Your branch name is too long to save in the Rider account's assigned branch field." }, { status: 400 });
  }
  const zone = typeof assignedZone === "string" ? assignedZone.trim() : "";
  if (role === "rider" && (!zone || zone.length > 80 || !["Active", "Inactive"].includes(String(employmentStatus)))) {
    return Response.json({ error: "Enter a rider zone and choose Active or Inactive employment status." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const account = await createTeamAccount({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role: role as TeamRole,
      cityId,
      accountStatus: accountStatus as "active" | "inactive" | "suspended",
      assignedZone: role === "rider" ? zone : undefined,
      employmentStatus: role === "rider" ? employmentStatus as "Active" | "Inactive" : undefined,
      branchId,
      assignedBranch,
      assignedByTeamId: session.userId,
    });
    return Response.json({ account }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Could not create team account.", error);
    return Response.json({ error: "Could not save the account. Check the server logs." }, { status: 503 });
  }
}

export const DELETE = withApiErrors(handleDELETE);
export const PATCH = withApiErrors(async(request:Request)=>{
  const session=await getSession();
  if(!session||!editableRoles[session.role].length) return Response.json({error:'Team management access is required.'},{status:403});
  if(!hasValidRequestOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  let body:Record<string,unknown>;
  try {const input=await request.json();if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error();body=input;} catch {return Response.json({error:'Enter valid account details.'},{status:400});}
  const text=(key:string)=>typeof body[key]==='string'?(body[key] as string).trim():'';
  const userId=text('userId'),name=text('name'),email=text('email').toLowerCase(),phone=text('phone'),accountStatus=text('accountStatus');
  if(!userId||name.length<2||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length>32||!/^\+?[\d\s().-]{6,31}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15||!['active','inactive','suspended'].includes(accountStatus)) return Response.json({error:'Enter a valid name, email, phone (7–15 digits), and account status.'},{status:400});
  if(['role','cityId','password','passwordHash'].some(key=>key in body)) return Response.json({error:'Role, city and password cannot be changed through this form.'},{status:400});
  try {
    const account=await updateTeamAccount({userId,name,email,phone,accountStatus:accountStatus as 'active'|'inactive'|'suspended',assignedZone:text('assignedZone'),employmentStatus:text('employmentStatus'),actor:session});
    return Response.json({account},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof TeamAccountDeleteError) return Response.json({error:error.message},{status:error.status});
    if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='23505') return Response.json({error:'An account with this email already exists.'},{status:409});
    throw error;
  }
});
export const GET = withApiErrors(handleGET);
export const POST = withApiErrors(handlePOST);

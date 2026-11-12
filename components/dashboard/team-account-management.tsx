"use client";

import { fetchResponse } from '@/lib/client-request';

import { useState, type FormEvent } from "react";
import type { CityOption } from "@/lib/dashboard-types";
import type { TeamAccount, TeamBranchOption, TeamRole } from "@/lib/admin-accounts";
import type { AssignedTeamBranch } from "@/lib/city-branches";
import { creatableRoles, deletableRoles as roleDeletionPolicy } from '@/lib/permissions';
import EditTeamAccount from './edit-team-account';

const roleTitles: Record<TeamRole, string> = { admin: "City Admin", city_manager: "Branch Admin", rider: "Rider" };
const allowedRoles: Record<string, TeamRole[]> = {
  super_admin: [...creatableRoles.super_admin],
  admin: ["city_manager", "rider"],
  city_manager: ["rider"],
};
const deletableRoles: Record<string, TeamRole[]> = {
  super_admin: [...roleDeletionPolicy.super_admin],
  admin: ["city_manager", "rider"],
  city_manager: ["rider"],
};
const roleKeyByTitle: Record<TeamAccount["role"], TeamRole> = { "City Admin": "admin", "Branch Admin": "city_manager", Rider: "rider" };

export default function TeamAccountManagement({ actorRole, initialAccounts, cities, branches = [], assignedCity, assignedBranch = null }: {
  actorRole: "super_admin" | "admin" | "city_manager";
  initialAccounts: TeamAccount[];
  cities: CityOption[];
  branches?: TeamBranchOption[];
  assignedCity: { cityId: string; cityName: string } | null;
  assignedBranch?: AssignedTeamBranch | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [role, setRole] = useState<TeamRole>(actorRole === "super_admin" ? "admin" : actorRole === "admin" ? "city_manager" : "rider");
  const [cityId, setCityId] = useState(assignedCity?.cityId ?? cities[0]?.city_id ?? "");
  const [branchId, setBranchId] = useState(branches.find((branch) => branch.city_id === (assignedCity?.cityId ?? cities[0]?.city_id))?.branch_id ?? "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<TeamAccount | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [typedEmail, setTypedEmail] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAccount,setEditingAccount]=useState<TeamAccount|null>(null);
  const [roleFilter,setRoleFilter]=useState('all');
  const [search,setSearch]=useState('');
  const visibleAccounts=accounts.filter(account=>(roleFilter==='all'||account.role===roleFilter)&&`${account.name} ${account.email} ${account.phone} ${account.cityName||''} ${account.branchName||''} ${account.zone||''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const availableBranches = branches.filter((branch) => branch.city_id === cityId);

  function canDelete(account: TeamAccount) {
    return deletableRoles[actorRole].includes(roleKeyByTitle[account.role]);
  }

  async function deleteAccount() {
    if (!deletingAccount || typedEmail.trim().toLowerCase() !== deletingAccount.email.toLowerCase() || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetchResponse("/api/team-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deletingAccount.id, confirmedEmail: typedEmail }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this account.");
      setAccounts((current) => current.filter((account) => account.id !== deletingAccount.id));
      setMessage(`${deletingAccount.name}'s access was removed. Historical records are preserved.`);
      setIsError(false);
      setDeletingAccount(null);
      setTypedEmail("");
      setDeleteStep(1);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete this account.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    if (password !== formData.get("confirmPassword")) {
      setIsError(true);
      setMessage("The passwords do not match.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchResponse("/api/team-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email"), password, role,
          accountStatus: formData.get("accountStatus"),
          cityId: actorRole !== "super_admin" ? assignedCity?.cityId : cityId,
          branchId: role === "city_manager" ? branchId : undefined,
          assignedZone: formData.get("assignedZone"),
          employmentStatus: formData.get("employmentStatus"),
        }),
      });
      const result: { account?: TeamAccount; error?: string } = await response.json();
      if (!response.ok || !result.account) throw new Error(result.error || "Could not create this account.");
      setAccounts((current) => [result.account!, ...current]);
      form.reset();
      setRole(actorRole === "super_admin" ? "admin" : actorRole === "admin" ? "city_manager" : "rider");
      setBranchId(branches.find((branch) => branch.city_id === (actorRole === "super_admin" ? cityId : assignedCity?.cityId))?.branch_id ?? "");
      setIsError(false);
      setMessage(`${result.account.role} account created and assigned to ${result.account.cityName || "the selected city"}.`);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not create this account.");
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="flex min-w-0 flex-col gap-6">
    {message&&<p role="status" aria-live="polite" className={`rounded-xl p-3 text-sm ${isError?'bg-[#fbeceb] text-[#913a34]':'bg-[#edf6e9] text-[#276431]'}`}>{message}</p>}
    <details className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
      <summary className="cursor-pointer text-lg font-bold text-[#203526]">+ Create a team account</summary>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Full name<input name="name" type="text" autoComplete="name" minLength={2} maxLength={120} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} minLength={7} pattern="[+0-9(). -]{7,32}" required placeholder="+92 300 1234567" className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Email address<input name="email" type="email" autoComplete="email" maxLength={254} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Role<select value={role} onChange={(event) => {const nextRole=event.target.value as TeamRole;setRole(nextRole);if(nextRole==='city_manager'&&!availableBranches.some(branch=>branch.branch_id===branchId))setBranchId(availableBranches[0]?.branch_id??'');}} aria-describedby={actorRole === "admin" ? "role-fields-help" : undefined} className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15">{allowedRoles[actorRole].map((item) => <option key={item} value={item}>{roleTitles[item]}</option>)}</select>{actorRole === "admin" && <span id="role-fields-help" className="text-xs font-normal text-[#718073]">{role === "rider" ? "Rider profile also requires an assigned zone and employment status." : "Select the branch this Branch Admin will manage."}</span>}</label>
        {actorRole === "super_admin" ? <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned city<select value={cityId} onChange={(event) => {const nextCity=event.target.value;setCityId(nextCity);setBranchId(branches.find(branch=>branch.city_id===nextCity)?.branch_id??'');}} required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="">Choose a city</option>{cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name} ({city.province})</option>)}</select></label> : <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned city<select defaultValue={assignedCity?.cityId ?? ""} disabled required aria-describedby="assigned-city-help" className="h-11 rounded-xl border border-[#dce8dc] bg-[#f8faf7] px-3 text-sm font-normal text-[#344639] outline-none disabled:cursor-not-allowed"><option value={assignedCity?.cityId ?? ""}>{assignedCity?.cityName ?? "City assignment required"}</option></select><span id="assigned-city-help" className="text-xs font-normal text-[#718073]">Accounts created here are assigned to your city.</span></label>}
        {actorRole === "city_manager" && assignedBranch && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned branch<input readOnly value={assignedBranch.branchName} className="h-11 rounded-xl border border-[#dce8dc] bg-[#f8faf7] px-3 text-sm font-normal text-[#536455]"/><span className="text-xs font-normal text-[#718073]">New Riders will be linked to this branch.</span></label>}
        {role === "city_manager" && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned branch<select name="branchId" value={branchId} onChange={(event)=>setBranchId(event.target.value)} required disabled={!availableBranches.length} className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15 disabled:bg-[#f8faf7]"><option value="">{availableBranches.length ? "Choose a branch" : "No active branches in this city"}</option>{availableBranches.map(branch=><option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>)}</select><span className="text-xs font-normal text-[#718073]">{availableBranches.length ? "This account will be scoped to the selected branch." : "Add an active branch to this city before creating a Branch Admin."}</span></label>}
        {role === "rider" && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned zone<input name="assignedZone" type="text" maxLength={80} required placeholder="For example, North Zone" className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>}
        {role === "rider" && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Employment status<select name="employmentStatus" defaultValue="Active" required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>}
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Login account status<select name="accountStatus" defaultValue="active" required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Initial password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/><span className="text-xs font-normal text-[#718073]">At least 12 characters.</span></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <button type="submit" disabled={isSaving || (actorRole === "super_admin" && !cityId) || (role === "city_manager" && !branchId)} className="mt-1 h-11 rounded-xl bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] disabled:cursor-wait disabled:opacity-60">{isSaving ? "Saving account..." : `Create ${roleTitles[role]}`}</button>
      </form>
    </details>
    <section className="overflow-hidden rounded-2xl border border-[#e3ebe0] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
      <div className="border-b border-[#e9efe7] bg-gradient-to-r from-[#f2f8ee] to-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#203526]">Team directory</h2><p className="mt-1 text-xs text-[#718073]">{accounts.length} members · {accounts.filter(account=>account.accountStatus==='active').length} active logins</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#276431]">{visibleAccounts.length} shown</span></div><div className="mt-5 flex flex-wrap gap-3"><label className="min-w-48 flex-1"><span className="sr-only">Search team</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name, email, city or zone…" className="h-11 w-full rounded-xl border border-[#dce8dc] bg-white px-4 text-sm outline-none focus:border-[#276431]"/></label><label><span className="sr-only">Filter team role</span><select value={roleFilter} onChange={event=>setRoleFilter(event.target.value)} className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm text-[#344639]"><option value="all">All roles</option>{(['City Admin','Branch Admin','Rider'] as const).filter(title=>actorRole==='super_admin'||(actorRole==='admin'?title!=='City Admin':title==='Rider')).map(title=><option key={title}>{title}</option>)}</select></label></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8faf7] text-[10px] font-bold uppercase tracking-wider text-[#657568]"><tr>{['Member','Role','City / Assignment','Phone','Login status','Actions'].map(title=><th key={title} scope="col" className="px-5 py-3.5">{title}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1eb]">{visibleAccounts.map(account=><tr key={account.id} className="transition hover:bg-[#f8fbf6]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#edf5e7] text-xs font-bold text-[#276431]">{account.name.split(' ').filter(Boolean).map(word=>word[0]).slice(0,2).join('')}</span><div><b className="block text-[#203526]">{account.name}</b><span className="mt-1 block text-xs text-[#718073]">{account.email}</span></div></div></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${account.role==='Rider'?'bg-[#edf4ff] text-[#3263a5]':account.role==='City Admin'?'bg-[#edf5e7] text-[#276431]':'bg-[#f2edfa] text-[#74579d]'}`}>{account.role}</span></td><td className="px-5 py-4 text-[#536455]">{account.cityName||'—'}{actorRole!=='super_admin'&&account.branchName&&<small className="mt-1 block text-[#74579d]">Branch: {account.branchName}</small>}{account.zone&&<small className="mt-1 block text-[#819176]">Zone: {account.zone}</small>}</td><td className="px-5 py-4 text-xs text-[#657568]">{account.phone||'—'}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${account.accountStatus==='active'?'bg-[#e9f4e4] text-[#32723a]':'bg-[#fff1e4] text-[#a46b2c]'}`}><i className="size-1.5 rounded-full bg-current"/>{account.accountStatus[0].toUpperCase()+account.accountStatus.slice(1)}</span>{account.employmentStatus&&account.employmentStatus.toLowerCase()!==account.accountStatus&&<small className="mt-1.5 block text-xs text-[#718073]">Employment: {account.employmentStatus}</small>}</td><td className="px-5 py-4">{canDelete(account)?<div className="flex gap-2"><button type="button" onClick={()=>setEditingAccount(account)} aria-label={`Edit ${account.name}`} className="rounded-lg border border-[#dce8dc] px-3 py-2 text-xs font-semibold text-[#276431] hover:bg-[#edf5e7]">Edit</button><button type="button" onClick={()=>{setDeletingAccount(account);setDeleteStep(1);setTypedEmail('');setDeleteError('');}} aria-label={`Delete ${account.name}`} className="rounded-lg border border-[#efd4d1] px-3 py-2 text-xs font-semibold text-[#a9483f] hover:bg-[#fbeceb]">Delete</button></div>:<span className="text-xs text-[#819176]">View only</span>}</td></tr>)}{visibleAccounts.length===0&&<tr><td colSpan={6} className="px-5 py-14 text-center text-[#718073]">No team accounts match your filters.</td></tr>}</tbody></table></div>
    </section>
    {editingAccount&&<EditTeamAccount key={editingAccount.id} account={editingAccount} onClose={()=>setEditingAccount(null)} onSaved={updated=>{setAccounts(current=>current.map(account=>account.id===updated.id?updated:account));setEditingAccount(null);setMessage(`${updated.name}'s account was updated.`);setIsError(false);}}/>}
    {deletingAccount && <div className="fixed inset-0 z-50 grid place-items-center bg-[#142019]/55 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#a9483f]">Confirmation {deleteStep} of 2</p><h2 id="delete-account-title" className="mt-2 text-xl font-bold text-[#203526]">Remove {deletingAccount.name}?</h2>{deleteStep === 1 ? <><p className="mt-3 text-sm leading-6 text-[#657568]">This disables sign-in and removes the account from active team access. Its historical collections and audit references will be preserved.</p><div className="mt-4 rounded-xl bg-[#f8faf7] p-4 text-sm"><b className="text-[#203526]">{deletingAccount.role}</b><p className="mt-1 text-[#657568]">{deletingAccount.email} · {deletingAccount.cityName || "No city"}</p></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeletingAccount(null)} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Cancel</button><button type="button" onClick={() => setDeleteStep(2)} className="rounded-lg bg-[#a9483f] px-4 py-2.5 text-sm font-semibold text-white">Continue</button></div></> : <><p className="mt-3 text-sm leading-6 text-[#657568]">To confirm, type this account&apos;s email address: <b className="text-[#203526]">{deletingAccount.email}</b></p><input autoFocus type="email" value={typedEmail} onChange={(event) => setTypedEmail(event.target.value)} aria-label="Type the account email to confirm" className="mt-4 h-11 w-full rounded-xl border border-[#dce8dc] px-3 text-sm outline-none focus:border-[#a9483f] focus:ring-4 focus:ring-[#a9483f]/10"/><p role="alert" className="mt-2 min-h-5 text-sm text-[#a9483f]">{deleteError}</p><div className="mt-4 flex justify-end gap-3"><button type="button" disabled={isDeleting} onClick={() => { setDeleteStep(1); setTypedEmail(""); setDeleteError(""); }} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Back</button><button type="button" disabled={isDeleting} onClick={() => setDeletingAccount(null)} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Cancel</button><button type="button" disabled={isDeleting || typedEmail.trim().toLowerCase() !== deletingAccount.email.toLowerCase()} onClick={deleteAccount} className="rounded-lg bg-[#a9483f] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? "Removing…" : "Delete account"}</button></div></>}</section></div>}
  </div>;
}

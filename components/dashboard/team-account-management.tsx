"use client";

import { useState, type FormEvent } from "react";
import type { CityOption } from "@/lib/dashboard-types";
import type { TeamAccount, TeamRole } from "@/lib/admin-accounts";

const roleTitles: Record<TeamRole, string> = { admin: "City Admin", city_manager: "Branch Admin", rider: "Rider" };
const allowedRoles: Record<string, TeamRole[]> = {
  super_admin: ["admin", "city_manager", "rider"],
  admin: ["city_manager", "rider"],
  city_manager: ["rider"],
};
const deletableRoles: Record<string, TeamRole[]> = {
  super_admin: ["admin", "city_manager", "rider"],
  admin: ["city_manager", "rider"],
  city_manager: ["rider"],
};
const roleKeyByTitle: Record<TeamAccount["role"], TeamRole> = { "City Admin": "admin", "Branch Admin": "city_manager", Rider: "rider" };

export default function TeamAccountManagement({ actorRole, initialAccounts, cities, assignedCity }: {
  actorRole: "super_admin" | "admin" | "city_manager";
  initialAccounts: TeamAccount[];
  cities: CityOption[];
  assignedCity: { cityId: string; cityName: string } | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [role, setRole] = useState<TeamRole>(actorRole === "super_admin" ? "admin" : actorRole === "admin" ? "city_manager" : "rider");
  const [cityId, setCityId] = useState(assignedCity?.cityId ?? cities[0]?.city_id ?? "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<TeamAccount | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [typedEmail, setTypedEmail] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function canDelete(account: TeamAccount) {
    return deletableRoles[actorRole].includes(roleKeyByTitle[account.role]);
  }

  async function deleteAccount() {
    if (!deletingAccount || typedEmail.trim().toLowerCase() !== deletingAccount.email.toLowerCase() || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/team-accounts", {
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
      const response = await fetch("/api/team-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email"), password, role,
          accountStatus: formData.get("accountStatus"),
          cityId: actorRole === "city_manager" ? assignedCity?.cityId : cityId,
          assignedZone: formData.get("assignedZone"),
          employmentStatus: formData.get("employmentStatus"),
        }),
      });
      const result: { account?: TeamAccount; error?: string } = await response.json();
      if (!response.ok || !result.account) throw new Error(result.error || "Could not create this account.");
      setAccounts((current) => [result.account!, ...current]);
      form.reset();
      setRole(actorRole === "super_admin" ? "admin" : actorRole === "admin" ? "city_manager" : "rider");
      setIsError(false);
      setMessage(`${result.account.role} account created and assigned to ${result.account.cityName || "the selected city"}.`);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not create this account.");
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
    <section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
      <div className="mb-5"><h2 className="text-lg font-bold text-[#203526]">Create a team account</h2><p className="mt-1 text-sm leading-6 text-[#718073]">The new login is saved in PostgreSQL and scoped to its assigned city.</p></div>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Full name<input name="name" type="text" autoComplete="name" minLength={2} maxLength={120} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} minLength={7} pattern="[+0-9(). -]{7,32}" required placeholder="+92 300 1234567" className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Email address<input name="email" type="email" autoComplete="email" maxLength={254} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Role<select value={role} onChange={(event) => setRole(event.target.value as TeamRole)} className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15">{allowedRoles[actorRole].map((item) => <option key={item} value={item}>{roleTitles[item]}</option>)}</select></label>
        {actorRole !== "city_manager" ? <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned city<select value={cityId} onChange={(event) => setCityId(event.target.value)} required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="">Choose a city</option>{cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name} ({city.province})</option>)}</select></label> : <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned city<select defaultValue={assignedCity?.cityId ?? ""} required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#344639] outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value={assignedCity?.cityId ?? ""}>{assignedCity?.cityName ?? "City assignment required"}</option></select><span className="text-xs font-normal text-[#718073]">Accounts created here are assigned to your city.</span></label>}
        {role === "rider" && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Assigned zone<input name="assignedZone" type="text" maxLength={80} required placeholder="For example, North Zone" className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>}
        {role === "rider" && <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Employment status<select name="employmentStatus" defaultValue="Active" required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>}
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Login account status<select name="accountStatus" defaultValue="active" required className="h-11 rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Initial password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/><span className="text-xs font-normal text-[#718073]">At least 12 characters.</span></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"/></label>
        <button type="submit" disabled={isSaving || (actorRole === "super_admin" && !cityId)} className="mt-1 h-11 rounded-xl bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] disabled:cursor-wait disabled:opacity-60">{isSaving ? "Saving account..." : `Create ${roleTitles[role]}`}</button>
        <p role="status" aria-live="polite" className={message ? `min-h-5 rounded-xl px-3 py-2 text-xs ${isError ? "bg-[#fbeceb] text-[#913a34]" : "bg-[#edf6e9] text-[#276431]"}` : "sr-only"}>{message}</p>
      </form>
    </section>
    <section className="overflow-hidden rounded-2xl border border-[#e3ebe0] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
      <div className="border-b border-[#e9efe7] px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#203526]">Team accounts</h2><p className="mt-1 text-sm text-[#718073]">Accounts visible in your scope. Eligible accounts have a Delete action pinned at the right edge of each row.</p></div><span className="rounded-full bg-[#edf6e9] px-3 py-1 text-xs font-bold text-[#276431]">{accounts.length}</span></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm"><thead className="bg-[#f8faf7] text-xs font-bold uppercase tracking-wide text-[#657568]"><tr><th scope="col" className="px-5 py-3">Name</th><th scope="col" className="px-5 py-3">Phone</th><th scope="col" className="px-5 py-3">Email</th><th scope="col" className="px-5 py-3">Role</th><th scope="col" className="px-5 py-3">City / Zone</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="sticky right-0 z-10 bg-[#f8faf7] px-5 py-3 shadow-[-8px_0_12px_-10px_rgba(32,53,38,.5)]">Action</th></tr></thead><tbody className="divide-y divide-[#edf1eb]">{accounts.map((account) => <tr key={account.id}><td className="px-5 py-4 font-semibold text-[#344639]">{account.name}</td><td className="px-5 py-4 text-[#657568]">{account.phone}</td><td className="px-5 py-4 text-[#657568]">{account.email}</td><td className="px-5 py-4"><span className="rounded-full bg-[#f2f6ef] px-2.5 py-1 text-xs font-semibold text-[#526552]">{account.role}</span></td><td className="px-5 py-4 text-[#718073]">{account.role === "Rider" && account.zone ? `${account.cityName || "—"} · ${account.zone}` : account.cityName || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.accountStatus === "active" ? "bg-[#e9f4e4] text-[#32723a]" : "bg-[#fbeceb] text-[#a9483f]"}`}>{account.accountStatus}{account.employmentStatus ? ` / ${account.employmentStatus}` : ""}</span></td><td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_12px_-10px_rgba(32,53,38,.5)]">{canDelete(account) && <button type="button" onClick={() => { setDeletingAccount(account); setDeleteStep(1); setTypedEmail(""); setDeleteError(""); }} className="rounded-lg border border-[#efd4d1] bg-white px-3 py-2 text-xs font-semibold text-[#a9483f] transition hover:bg-[#fbeceb]">Delete</button>}</td></tr>)}{accounts.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-[#718073]">No team accounts found in this scope.</td></tr>}</tbody></table></div>
    </section>
    {deletingAccount && <div className="fixed inset-0 z-50 grid place-items-center bg-[#142019]/55 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#a9483f]">Confirmation {deleteStep} of 2</p><h2 id="delete-account-title" className="mt-2 text-xl font-bold text-[#203526]">Remove {deletingAccount.name}?</h2>{deleteStep === 1 ? <><p className="mt-3 text-sm leading-6 text-[#657568]">This disables sign-in and removes the account from active team access. Its historical collections and audit references will be preserved.</p><div className="mt-4 rounded-xl bg-[#f8faf7] p-4 text-sm"><b className="text-[#203526]">{deletingAccount.role}</b><p className="mt-1 text-[#657568]">{deletingAccount.email} · {deletingAccount.cityName || "No city"}</p></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeletingAccount(null)} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Cancel</button><button type="button" onClick={() => setDeleteStep(2)} className="rounded-lg bg-[#a9483f] px-4 py-2.5 text-sm font-semibold text-white">Continue</button></div></> : <><p className="mt-3 text-sm leading-6 text-[#657568]">To confirm, type this account&apos;s email address: <b className="text-[#203526]">{deletingAccount.email}</b></p><input autoFocus type="email" value={typedEmail} onChange={(event) => setTypedEmail(event.target.value)} aria-label="Type the account email to confirm" className="mt-4 h-11 w-full rounded-xl border border-[#dce8dc] px-3 text-sm outline-none focus:border-[#a9483f] focus:ring-4 focus:ring-[#a9483f]/10"/><p role="alert" className="mt-2 min-h-5 text-sm text-[#a9483f]">{deleteError}</p><div className="mt-4 flex justify-end gap-3"><button type="button" disabled={isDeleting} onClick={() => { setDeleteStep(1); setTypedEmail(""); setDeleteError(""); }} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Back</button><button type="button" disabled={isDeleting} onClick={() => setDeletingAccount(null)} className="rounded-lg border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#536455]">Cancel</button><button type="button" disabled={isDeleting || typedEmail.trim().toLowerCase() !== deletingAccount.email.toLowerCase()} onClick={deleteAccount} className="rounded-lg bg-[#a9483f] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? "Removing…" : "Delete account"}</button></div></>}</section></div>}
  </div>;
}

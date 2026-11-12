"use client";

import { fetchResponse } from "@/lib/client-request";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CityBranch } from "@/lib/city-branches";

const fieldClass = "h-11 w-full rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15";

export default function CityBranchManagement({ cityName, initialBranches }: {
  cityName: string;
  initialBranches: CityBranch[];
}) {
  const router = useRouter();
  const [branches, setBranches] = useState(initialBranches);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchResponse("/api/dashboard/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok || !result.branch) throw new Error(result.error || "Could not create branch.");
      setBranches((current) => [result.branch as CityBranch, ...current]);
      form.reset();
      setMessage(`${result.branch.name} was added to ${cityName}.`);
      setIsError(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create branch.");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
    <section className="h-fit rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#72915f]">New location</p>
        <h2 className="mt-1 text-xl font-bold text-[#203526]">Create a branch</h2>
        <p className="mt-1 text-sm leading-6 text-[#718073]">This branch will belong to {cityName}. Existing branches will not be changed.</p>
      </div>
      {message && <p role={isError ? "alert" : "status"} className={`mb-4 rounded-xl p-3 text-sm ${isError ? "bg-[#fbeceb] text-[#913a34]" : "bg-[#edf6e9] text-[#276431]"}`}>{message}</p>}
      <form onSubmit={createBranch} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639] sm:col-span-2">Branch name<input name="name" required minLength={2} maxLength={120} autoComplete="organization" className={fieldClass} placeholder="For example, North Nazimabad Branch"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Branch code <span className="font-normal text-[#819176]">Optional</span><input name="code" maxLength={40} className={fieldClass} placeholder="For example, KHI-NN"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Contact phone <span className="font-normal text-[#819176]">Optional</span><input name="contactPhone" type="tel" inputMode="tel" maxLength={32} pattern="[+0-9(). -]{0,32}" className={fieldClass} placeholder="+92 300 1234567"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639] sm:col-span-2">Address <span className="font-normal text-[#819176]">Optional</span><textarea name="address" maxLength={2000} rows={3} className="w-full resize-y rounded-xl border border-[#dce8dc] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15" placeholder="Branch location or postal address"/></label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">Branch status<select name="status" defaultValue="active" className={fieldClass}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <button type="submit" disabled={isSaving} className="mt-auto h-11 rounded-xl bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] disabled:cursor-wait disabled:opacity-60">{isSaving ? "Creating branch…" : "Create branch"}</button>
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#e3ebe0] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
      <div className="border-b border-[#e9efe7] bg-gradient-to-r from-[#f2f8ee] to-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#72915f]">{cityName}</p><h2 className="mt-1 text-xl font-bold text-[#203526]">Branches in your city</h2></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#276431]">{branches.length} total</span>
        </div>
      </div>
      {branches.length ? <ul className="divide-y divide-[#edf1eb]">
        {branches.map((branch) => <li key={branch.branchId} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold text-[#203526]">{branch.name}</h3><p className="mt-1 text-xs text-[#718073]">{branch.code ? `Code: ${branch.code}` : "No branch code"}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${branch.status === "active" ? "bg-[#e9f4e4] text-[#32723a]" : "bg-[#fff1e4] text-[#a46b2c]"}`}>{branch.status === "active" ? "Active" : "Inactive"}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-[#819176]">Address</dt><dd className="mt-1 text-[#536455]">{branch.address || "Not provided"}</dd></div>
            <div><dt className="text-xs text-[#819176]">Contact phone</dt><dd className="mt-1 text-[#536455]">{branch.contactPhone || "Not provided"}</dd></div>
          </dl>
        </li>)}
      </ul> : <div className="p-8 text-center"><p className="font-semibold text-[#344639]">No branches registered yet</p><p className="mt-1 text-sm text-[#718073]">Create the first branch using the form.</p></div>}
    </section>
  </div>;
}

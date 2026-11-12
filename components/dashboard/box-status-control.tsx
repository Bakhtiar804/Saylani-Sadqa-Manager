"use client";

import { fetchResponse } from '@/lib/client-request';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Active", "Inactive", "Damaged", "Under Review"];

export default function BoxStatusControl({ boxId, currentStatus }: { boxId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    try {
      const response = await fetchResponse(`/api/dashboard/boxes/${encodeURIComponent(boxId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok || !result.status) throw new Error(result.error || "Could not update this box.");
      setSuccess(`Status changed to ${result.status}.`);
      setReason("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update this box.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-[#dce8dc] bg-white p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
    <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">New status<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy} className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Reason for change<input value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={500} disabled={busy} placeholder="Describe the inspection or status change" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
    <button type="submit" disabled={busy || status === currentStatus} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Update status"}</button>
    {error && <p role="alert" className="text-sm text-[#913a34] sm:col-span-3">{error}</p>}
    {success && <p role="status" className="text-sm text-[#276431] sm:col-span-3">{success}</p>}
  </form>;
}

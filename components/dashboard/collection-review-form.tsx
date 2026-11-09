"use client";

import { useEffect, useState, type FormEvent } from "react";

type AuditEvent = {
  id: string;
  action: string | null;
  actorName: string | null;
  occurredAt: string | null;
  before: unknown;
  after: unknown;
};

export default function CollectionReviewForm({ collectionId, status, onReviewed }: {
  collectionId: string;
  status: string;
  onReviewed: (status: string) => void;
}) {
  const [decision, setDecision] = useState("Verified");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [historyError, setHistoryError] = useState("");
  const isLocked = status === "Verified";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard/collections/${encodeURIComponent(collectionId)}/verification`, {
      signal: controller.signal, cache: "no-store",
    }).then(async (response) => {
      const result = await response.json() as { events?: AuditEvent[]; error?: string };
      if (!response.ok || !result.events) throw new Error(result.error || "Could not load audit history.");
      setEvents(result.events);
    }).catch((historyError) => {
      if (!controller.signal.aborted) setHistoryError(historyError instanceof Error ? historyError.message : "Could not load audit history.");
    });
    return () => controller.abort();
  }, [collectionId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/collections/${encodeURIComponent(collectionId)}/verification`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: decision, notes }),
      });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok || !result.status) throw new Error(result.error || "Could not save the review.");
      onReviewed(result.status);
      setNotes("");
      const historyResponse = await fetch(`/api/dashboard/collections/${encodeURIComponent(collectionId)}/verification`, { cache: "no-store" });
      const historyResult = await historyResponse.json() as { events?: AuditEvent[] };
      if (historyResponse.ok && historyResult.events) setEvents(historyResult.events);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the review.");
    } finally { setBusy(false); }
  }

  return <div className="mt-5 space-y-4">
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#dce8dc] bg-white p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Review decision<select value={decision} onChange={(event) => setDecision(event.target.value)} disabled={busy || isLocked} className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]"><option value="Verified">Verify</option><option value="Flagged">Flag for review</option></select></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Review note{decision === "Flagged" ? " (required)" : " (optional)"}<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} disabled={busy || isLocked} placeholder="Add context for the audit record" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <button type="submit" disabled={busy || isLocked} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:cursor-not-allowed disabled:opacity-50">{isLocked ? "Verified" : busy ? "Saving…" : "Save review"}</button>
      {error && <p role="alert" className="text-sm text-[#913a34] sm:col-span-3">{error}</p>}
      {isLocked && <p className="text-xs text-[#657568] sm:col-span-3">Verified records are locked. Use the correction workflow to amend one.</p>}
    </form>
    <section className="rounded-xl border border-[#e3ebe0] bg-white p-4" aria-label="Collection audit history">
      <h3 className="text-sm font-bold text-[#203526]">Audit history</h3>
      {historyError && <p role="alert" className="mt-2 text-sm text-[#913a34]">{historyError}</p>}
      {!historyError && events.length === 0 && <p className="mt-2 text-sm text-[#718073]">No recorded actions yet.</p>}
      {events.length > 0 && <ol className="mt-3 space-y-3">{events.map((event) => <li key={event.id} className="border-l-2 border-[#b9d5b2] pl-3"><p className="text-sm font-semibold text-[#344639]">{(event.action || "updated").replaceAll("_", " ")} · {event.actorName || "Team member"}</p><p className="mt-0.5 text-xs text-[#718073]">{event.occurredAt ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt)) : "Time unavailable"}</p></li>)}</ol>}
    </section>
  </div>;
}

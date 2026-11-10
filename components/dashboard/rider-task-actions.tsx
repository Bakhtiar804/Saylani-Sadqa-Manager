"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DataRecord } from "@/lib/dashboard-types";

type RiderTask = DataRecord & {
  task_id: string;
  task_date: string;
  task_type: string;
  task_status: string;
  box_id: string;
  area: string | null;
  location_description: string | null;
  box_status: string;
};

function formatDate(value: string) {
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(date);
}

export default function RiderTaskActions({ tasks, canUpdateTasks, today }: { tasks: DataRecord[]; canUpdateTasks: boolean; today: string }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(() => new Map(tasks.map((task) => [String(task.task_id), String(task.task_status)])));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyTask, setBusyTask] = useState("");
  const [messages, setMessages] = useState<Record<string, { error?: string; success?: string }>>({});

  async function updateTask(taskId: string, status: "In Progress" | "Skipped" | "Completed") {
    setBusyTask(taskId);
    setMessages((current) => ({ ...current, [taskId]: {} }));
    try {
      const response = await fetch(`/api/dashboard/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes[taskId] ?? "" }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok || !result.status) throw new Error(result.error || "Could not update this task.");
      const nextStatus = result.status;
      setStatuses((current) => new Map(current).set(taskId, nextStatus));
      setMessages((current) => ({ ...current, [taskId]: { success: `Task marked ${nextStatus.toLowerCase()}.` } }));
      router.refresh();
    } catch (error) {
      setMessages((current) => ({ ...current, [taskId]: { error: error instanceof Error ? error.message : "Could not update this task." } }));
    } finally { setBusyTask(""); }
  }

  async function submitCollection(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    setBusyTask(taskId);
    setMessages((current) => ({ ...current, [taskId]: {} }));
    try {
      const response = await fetch(`/api/dashboard/tasks/${encodeURIComponent(taskId)}/collection`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amounts[taskId], notes: notes[taskId] ?? "" }),
      });
      const result = await response.json() as { error?: string; collectionId?: string };
      if (!response.ok || !result.collectionId) throw new Error(result.error || "Could not submit this collection.");
      setStatuses((current) => new Map(current).set(taskId, "Completed"));
      setMessages((current) => ({ ...current, [taskId]: { success: `Collection ${result.collectionId} submitted for verification.` } }));
      router.refresh();
    } catch (error) {
      setMessages((current) => ({ ...current, [taskId]: { error: error instanceof Error ? error.message : "Could not submit this collection." } }));
    } finally { setBusyTask(""); }
  }

  if (tasks.length === 0) return <section className="rounded-2xl border border-[#e3ebe0] bg-white p-8 text-center"><h2 className="font-bold text-[#203526]">No tasks assigned</h2><p className="mt-1 text-sm text-[#718073]">New work assigned to your rider account will appear here.</p></section>;

  return <section className="grid gap-4" aria-label="Assigned rider tasks">
    {!canUpdateTasks && <p className="rounded-lg bg-[#fff4db] p-3 text-sm text-[#76561a]">Your rider profile is inactive. You can view tasks here, and task actions become available when your profile is active.</p>}
    {(tasks as RiderTask[]).map((task) => {
      const status = statuses.get(task.task_id) ?? task.task_status;
      const isCompleted = status === "Completed";
      const showActions = canUpdateTasks && !isCompleted && status !== "Cancelled";
      const isSkipped = status === "Skipped";
      const isFutureTask = task.task_date > today;
      const isCollection = task.task_type === "Scheduled Collection";
      const busy = busyTask === task.task_id;
      const message = messages[task.task_id];
      return <article id={task.task_id} key={task.task_id} className="scroll-mt-24 rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-[#718073]">{task.task_id} · {formatDate(task.task_date)}</p><h2 className="mt-1 text-lg font-bold text-[#203526]">{task.task_type} · {task.box_id}</h2><p className="mt-1 text-sm text-[#536455]">{task.area || "Area not specified"}{task.location_description ? ` · ${task.location_description}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? "bg-[#e8f4e5] text-[#276431]" : isSkipped ? "bg-[#f0f1ef] text-[#657568]" : "bg-[#fff4db] text-[#91661c]"}`}>{status}</span>
        </div>
        <p className="mt-2 text-xs text-[#657568]">Assigned by {task.assigned_by_name || "Not recorded"}</p>
        {message?.error && <p role="alert" className="mt-4 rounded-lg bg-[#fbeceb] p-3 text-sm text-[#913a34]">{message.error}</p>}
        {message?.success && <p role="status" className="mt-4 rounded-lg bg-[#edf6e9] p-3 text-sm text-[#276431]">{message.success}</p>}
        {showActions && isFutureTask && <p className="mt-4 rounded-lg bg-[#fff4db] p-3 text-sm text-[#76561a]">Task actions will be available from {formatDate(task.task_date)}.</p>}
        {showActions && !isFutureTask && <>
          <label className="mt-4 grid gap-1.5 text-xs font-semibold text-[#536455]">Field note (optional)<input value={notes[task.task_id] ?? ""} maxLength={500} onChange={(event) => setNotes((current) => ({ ...current, [task.task_id]: event.target.value }))} disabled={busy} placeholder="Add a short visit note" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
          {!isSkipped && isCollection && (task.box_status === "Active" ? <form onSubmit={(event) => submitCollection(event, task.task_id)} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid w-full max-w-xs gap-1.5 text-xs font-semibold text-[#536455]">Amount collected (PKR)<input type="number" min="0.01" max="100000000" step="0.01" required value={amounts[task.task_id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [task.task_id]: event.target.value }))} disabled={busy} placeholder="0.00" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
            <button disabled={busy} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:opacity-50">{busy ? "Submitting…" : "Submit collection"}</button>
          </form> : <p className="mt-4 rounded-lg bg-[#fff4db] p-3 text-sm text-[#76561a]">This box is {task.box_status.toLowerCase()}; a collection cannot be submitted until it is active.</p>)}
          <div className="mt-4 flex flex-wrap gap-3">
            {!isSkipped && !isCollection && <button type="button" onClick={() => updateTask(task.task_id, "Completed")} disabled={busy} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:opacity-50">Complete visit</button>}
            {status !== "In Progress" && <button type="button" onClick={() => updateTask(task.task_id, "In Progress")} disabled={busy} className="h-10 rounded-lg border border-[#dce8dc] px-4 text-sm font-semibold text-[#344639] disabled:opacity-50">{isSkipped ? "Resume task" : "Start task"}</button>}
            {!isSkipped && <button type="button" onClick={() => updateTask(task.task_id, "Skipped")} disabled={busy} className="h-10 rounded-lg px-3 text-sm font-semibold text-[#657568] hover:bg-[#f4f7f3] disabled:opacity-50">Skip task</button>}
          </div>
        </>}
      </article>;
    })}
  </section>;
}

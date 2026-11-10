"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DataRecord } from "@/lib/dashboard-types";
import { getPakistanDate, taskTypes } from "@/lib/task-assignment";

type Rider = DataRecord & {
  rider_id: string;
  rider_name: string;
  city_id: string;
  employment_status: string;
};

type Box = DataRecord & {
  box_id: string;
  city_id: string;
  city_name: string;
  area: string;
  box_status: string;
};

const fieldClass = "h-10 w-full rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46]";

export default function RiderAssignmentForm({ riders, boxes, today }: { riders: DataRecord[]; boxes: DataRecord[]; today: string }) {
  const router = useRouter();
  const activeRiders = (riders as Rider[]).filter((rider) => rider.employment_status === "Active");
  const [riderId, setRiderId] = useState("");
  const [taskType, setTaskType] = useState<(typeof taskTypes)[number]>(taskTypes[0]);
  const [minDate, setMinDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const rider = activeRiders.find((item) => item.rider_id === riderId);
  const isCollection = taskType === "Scheduled Collection";
  const availableBoxes = (boxes as Box[]).filter((box) => box.city_id === rider?.city_id && (!isCollection || box.box_status === "Active"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const currentDate = getPakistanDate();
    setMinDate(currentDate);
    if (typeof values.taskDate !== "string" || values.taskDate < currentDate) {
      setError("Choose today or a future task date.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/dashboard/rider-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, riderId, taskType }),
      });
      const result = await response.json() as { taskId?: string; error?: string };
      if (!response.ok || !result.taskId) throw new Error(result.error || "Could not assign this rider.");
      setSuccess(`Task ${result.taskId} assigned successfully.`);
      form.reset();
      setRiderId("");
      setTaskType(taskTypes[0]);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not assign this rider.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mb-6 rounded-2xl border border-[#dce8dc] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
      <summary className="cursor-pointer list-none px-5 py-4 font-bold text-[#203526] marker:hidden">
        Assign a rider to a task <span className="ml-2 text-sm font-normal text-[#718073]">Choose an active rider, box, date, and task type.</span>
      </summary>
      <form onSubmit={submit} className="grid gap-4 border-t border-[#e9efe7] p-5 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">
          Rider
          <select value={riderId} onChange={(event) => setRiderId(event.target.value)} required className={fieldClass}>
            <option value="">Choose an active rider</option>
            {activeRiders.map((item) => <option key={item.rider_id} value={item.rider_id}>{item.rider_name} · {item.city_name || item.city_id}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">
          Donation box
          <select key={riderId + taskType} name="boxId" required disabled={!riderId || availableBoxes.length === 0} className={fieldClass}>
            <option value="">{riderId ? "Choose a box in the rider's city" : "Choose a rider first"}</option>
            {availableBoxes.map((item) => <option key={item.box_id} value={item.box_id}>{item.box_id} · {item.area} · {item.city_name} · {item.box_status}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">
          Task date
          <input name="taskDate" type="date" min={minDate} required onFocus={() => setMinDate(getPakistanDate())} className={fieldClass}/>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">
          Task type
          <select value={taskType} onChange={(event) => setTaskType(event.target.value as (typeof taskTypes)[number])} className={fieldClass}>
            {taskTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {activeRiders.length === 0 && <p className="text-sm text-[#76561a] sm:col-span-2 xl:col-span-4">There are no active riders available to assign.</p>}
        {riderId && availableBoxes.length === 0 && <p className="text-sm text-[#76561a] sm:col-span-2 xl:col-span-4">There are no eligible boxes in this rider’s city for this task type.</p>}
        {error && <p role="alert" className="text-sm text-[#913a34] sm:col-span-2 xl:col-span-4">{error}</p>}
        {success && <p role="status" className="text-sm text-[#276431] sm:col-span-2 xl:col-span-4">{success}</p>}
        <div className="sm:col-span-2 xl:col-span-4">
          <button disabled={busy || !riderId || availableBoxes.length === 0} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:opacity-50">
            {busy ? "Assigning…" : "Assign rider"}
          </button>
        </div>
      </form>
    </details>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { getRiderTaskNotifications } from "@/lib/rider-dashboard";
import Icon from "./icons";

export default function RiderNotificationBell({ count, tasks }: Awaited<ReturnType<typeof getRiderTaskNotifications>>) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={container}>
      <button
        ref={button}
        type="button"
        aria-label={`Task notifications, ${count} waiting to start`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="relative grid size-10 place-items-center rounded-lg border border-[#dce8dc] text-[#276431] hover:bg-[#f5faf2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276431]"
      >
        <Icon name="bell" size={19} />
        {count > 0 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#a9483f] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>}
      </button>
      <section
        id={panelId}
        aria-label="Task notifications"
        hidden={!open}
        className="absolute right-4 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#dce8dc] bg-white shadow-lg sm:right-6"
      >
        <div className="border-b border-[#e7ede5] px-4 py-3">
          <h2 className="font-bold text-[#203526]">Task notifications</h2>
          <p className="mt-1 text-xs text-[#657568]">{count ? `${count} waiting to start` : "No tasks waiting to start."}</p>
        </div>
        {tasks.length > 0 && (
          <ul className="max-h-[50vh] divide-y divide-[#e7ede5] overflow-y-auto">
            {tasks.map((task) => (
              <li key={task.task_id}>
                <Link href={`/dashboard/rider/tasks#${encodeURIComponent(task.task_id)}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-[#f5faf2]">
                  <p className="text-sm font-semibold text-[#276431]">{task.task_type} · {task.box_id}</p>
                  <p className="mt-1 text-xs text-[#657568]">{task.task_date} · Assigned by {task.assigned_by_name ?? "Not recorded"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/rider/tasks" onClick={() => setOpen(false)} className="block rounded-b-2xl border-t border-[#e7ede5] px-4 py-3 text-sm font-semibold text-[#276431] hover:bg-[#f5faf2]">View my tasks</Link>
      </section>
    </div>
  );
}

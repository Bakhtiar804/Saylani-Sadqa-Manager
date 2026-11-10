"use client";

import { useState, type ReactNode } from "react";

export default function CityCollectionRegister({ collections, fieldVisits }: {
  collections: ReactNode;
  fieldVisits: ReactNode;
}) {
  const [view, setView] = useState<"collections" | "visits">("collections");
  const views = [
    { id: "collections", label: "Collections" },
    { id: "visits", label: "Field Visits" },
  ] as const;

  return (
    <div>
      <div role="group" aria-label="Collection register views" className="mb-3 inline-flex flex-wrap gap-1 rounded-xl border border-[#e3ebe0] bg-white p-1">
        {views.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#405345] hover:bg-[#f4f8f2] aria-pressed:bg-[#e8f4e5] aria-pressed:text-[#276431]"
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={view !== "collections"}>{collections}</div>
      <div hidden={view !== "visits"}>{fieldVisits}</div>
    </div>
  );
}

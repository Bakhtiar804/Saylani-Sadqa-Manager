"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CityOption, DataRecord, RecordColumn, RecordValue } from "@/lib/dashboard-types";

function prettyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: RecordValue, key: string, cityById: Map<string, string>): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "city_id") return cityById.get(String(value)) || String(value);
  if (key.endsWith("_pkr")) return `Rs ${Number(value).toLocaleString("en-PK")}`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type RecordExplorerProps = {
  title: string;
  description: string;
  records: DataRecord[];
  columns: RecordColumn[];
  statusKey?: string;
  cityKey?: string;
  dateKey?: string;
  cities?: CityOption[];
  initialSortDirection?: "asc" | "desc";
};

export default function RecordExplorer({ title, description, records, columns, statusKey = "", cityKey = "city_id", dateKey = "", cities = [], initialSortDirection = "desc" }: RecordExplorerProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({ key: dateKey || columns[0]?.key || "", direction: initialSortDirection });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState("");
  const pageSize = 10;
  const cityById = useMemo(() => new Map<string, string>(cities.map((item) => [item.city_id, item.city_name])), [cities]);
  const statuses = useMemo(() => statusKey ? [...new Set(records.map((item) => String(item[statusKey] ?? "")).filter(Boolean))].sort() : [], [records, statusKey]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !needle || Object.entries(record).some(([key, value]) => key !== "is_demo_record" && String(value ?? "").toLowerCase().includes(needle));
      const matchesStatus = status === "all" || String(record[statusKey]) === status;
      const matchesCity = city === "all" || String(record[cityKey]) === city;
      const recordDate = String(record[dateKey] ?? "");
      const matchesFrom = !from || !recordDate || recordDate >= from;
      const matchesTo = !to || !recordDate || recordDate <= to;
      return matchesQuery && matchesStatus && matchesCity && matchesFrom && matchesTo;
    }).sort((a, b) => {
      if (!sort.key) return 0;
      const left = a[sort.key] ?? "";
      const right = b[sort.key] ?? "";
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [records, query, status, city, from, to, statusKey, cityKey, dateKey, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetPage = (setter: Dispatch<SetStateAction<string>>) => (value: string) => { setter(value); setPage(1); };

  function toggleSort(key: string) {
    setSort((previous) => ({ key, direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc" }));
  }

  return <section className="overflow-hidden rounded-2xl border border-[#e3ebe0] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
    <div className="border-b border-[#e9efe7] p-5 sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold text-[#203526]">{title}</h2><p className="mt-1 text-sm text-[#718073]">{description} <span className="font-semibold text-[#536455]">{records.length.toLocaleString("en-PK")} records</span></p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1.5 text-xs font-semibold text-[#536455] sm:col-span-2 xl:col-span-2">Search records<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Search IDs, locations, names..." className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526] outline-none placeholder:text-[#9aa69a] focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"/></label>
        {statusKey && <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Status<select value={status} onChange={(event) => resetPage(setStatus)(event.target.value)} className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526] outline-none focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"><option value="all">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {cityKey && <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">City<select value={city} onChange={(event) => resetPage(setCity)(event.target.value)} className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526] outline-none focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"><option value="all">All cities</option>{cities.map((item) => <option key={item.city_id} value={item.city_id}>{item.city_name}</option>)}</select></label>}
        {dateKey && <div className="grid grid-cols-2 gap-2"><label className="grid gap-1.5 text-xs font-semibold text-[#536455]">From<input type="date" value={from} onChange={(event) => resetPage(setFrom)(event.target.value)} className="h-10 min-w-0 rounded-lg border border-[#dce8dc] px-2 text-xs text-[#203526] outline-none focus:border-[#276431]"/></label><label className="grid gap-1.5 text-xs font-semibold text-[#536455]">To<input type="date" value={to} onChange={(event) => resetPage(setTo)(event.target.value)} className="h-10 min-w-0 rounded-lg border border-[#dce8dc] px-2 text-xs text-[#203526] outline-none focus:border-[#276431]"/></label></div>}
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-left"><thead className="bg-[#f8faf7]"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 text-xs font-bold uppercase tracking-[.06em] text-[#657568]"><button onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1.5 hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-[#61bb46]">{column.label}<span aria-hidden="true">{sort.key === column.key ? sort.direction === "asc" ? "↑" : "↓" : "↕"}</span></button></th>)}<th className="px-4 py-3 text-xs font-bold uppercase tracking-[.06em] text-[#657568]">Details</th></tr></thead><tbody>{visible.map((record, index) => { const recordId = String(record[columns[0]?.key] ?? `${index}`); const isOpen = expanded === recordId; return <FragmentRow key={recordId} record={record} isOpen={isOpen} columns={columns} onToggle={() => setExpanded(isOpen ? "" : recordId)} cityById={cityById}/>; })}</tbody></table>
      {visible.length === 0 && <div className="px-6 py-14 text-center"><p className="text-base font-semibold text-[#344639]">No matching records</p><p className="mt-1 text-sm text-[#718073]">Try clearing or adjusting your filters.</p></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efe7] px-5 py-4 text-sm text-[#657568]"><span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length.toLocaleString("en-PK")}</span><div className="flex items-center gap-2"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-[#dce8dc] px-3 py-2 font-semibold transition hover:bg-[#f4f8f2] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="min-w-16 text-center text-xs">Page {currentPage} / {pageCount}</span><button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-[#dce8dc] px-3 py-2 font-semibold transition hover:bg-[#f4f8f2] disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>
  </section>;
}

type FragmentRowProps = {
  record: DataRecord;
  isOpen: boolean;
  columns: RecordColumn[];
  onToggle: () => void;
  cityById: Map<string, string>;
};

function FragmentRow({ record, isOpen, columns, onToggle, cityById }: FragmentRowProps) {
  return <>
    <tr className="border-b border-[#edf1eb] align-middle text-[13px] text-[#405345] transition hover:bg-[#fbfdf9]">{columns.map((column) => <td key={column.key} className="max-w-[260px] px-4 py-3.5"><span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={String(record[column.key] ?? "—")}>{displayValue(record[column.key], column.key, cityById)}</span></td>)}<td className="px-4 py-3.5"><button aria-expanded={isOpen} onClick={onToggle} className="rounded-lg border border-[#dce8dc] px-3 py-2 text-xs font-semibold text-[#276431] transition hover:bg-[#edf6e9] focus-visible:outline-2 focus-visible:outline-[#61bb46]">{isOpen ? "Hide" : "Details"}</button></td></tr>
    {isOpen && <tr className="border-b border-[#edf1eb] bg-[#f8fbf6]"><td colSpan={columns.length + 1} className="px-5 py-4"><div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(record).filter(([key]) => !/password/i.test(key)).map(([key, value]) => <div key={key} className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wide text-[#718073]">{prettyLabel(key)}</p><p className="mt-1 break-words text-[13px] text-[#344639]">{displayValue(value, key, cityById)}</p></div>)}</div></td></tr>}
  </>;
}

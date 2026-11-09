import type { CityOption } from "@/lib/dashboard-types";

type DashboardFiltersProps = {
  range?: string;
  city?: string;
  cities: CityOption[];
};

export default function DashboardFilters({ range = "30", city = "all", cities }: DashboardFiltersProps) {
  return <form action="/dashboard" className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e3ebe0] bg-white p-4 shadow-[0_3px_14px_rgba(28,52,33,.025)]"><label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Period<select name="range" defaultValue={range} className="h-10 min-w-36 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm text-[#203526] outline-none focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available dates</option></select></label><label className="grid gap-1.5 text-xs font-semibold text-[#536455]">City<select name="city" defaultValue={city} className="h-10 min-w-40 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm text-[#203526] outline-none focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"><option value="all">All cities</option>{cities.map((item) => <option key={item.city_id} value={item.city_id}>{item.city_name}</option>)}</select></label><button className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46]">Apply filters</button><p className="ml-auto self-center text-xs text-[#718073] max-sm:ml-0">Figures follow the latest demo collection date.</p></form>;
}

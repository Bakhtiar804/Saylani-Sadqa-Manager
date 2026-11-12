import { BreakdownBarChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import { formatPKR, type ImportedCityReportSummary } from "@/lib/dashboard-data";

export default function ImportedCityReports({
  cityName,
  reports,
}: {
  cityName: string;
  reports: ImportedCityReportSummary;
}) {
  if (!reports.collections.records && !reports.expenses.records && !reports.staff.latestTotal) return null;

  const metrics = [
    ["Collection report rows", reports.collections.records.toLocaleString("en-PK")],
    ["Reported collection amount", formatPKR(reports.collections.amount)],
    ["Reported expense amount", formatPKR(reports.expenses.amount)],
    ["Latest reported staff", reports.staff.latestTotal.toLocaleString("en-PK")],
  ];

  return <section className="mb-6 rounded-2xl border border-[#dce8dc] bg-[#f8fbf7] p-5 sm:p-6">
    <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#5c785e]">City-scoped imported data</p><h2 className="mt-1 text-xl font-bold text-[#203526]">Monthly reports for {cityName}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#718073]">Source reports matched to this city. They summarize monthly data and are separate from transaction-level verification and reconciliation registers.</p></div>
    <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-[#e3ebe0] bg-white p-4"><dt className="text-xs font-semibold text-[#718073]">{label}</dt><dd className="mt-1 text-lg font-bold text-[#203526]">{value}</dd></div>)}</dl>
    {reports.collections.records > 0 && <ChartPanel title="Reported collections by month" description={`${reports.collections.firstMonth?.slice(0, 7) ?? ""} to ${reports.collections.latestMonth?.slice(0, 7) ?? ""}; source totals, not verified transactions.`}>
      <BreakdownBarChart data={reports.collections.monthly.slice(-12).map((item) => ({ name: item.label, value: item.value }))} valueFormat="currency" height={250}/>
    </ChartPanel>}
    {reports.staff.latestMonth && <p className="mt-4 text-xs text-[#718073]">Latest staff snapshot: {reports.staff.latestMonth.slice(0, 7)}.</p>}
  </section>;
}

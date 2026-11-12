import { BreakdownBarChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import MetricGrid from "@/components/dashboard/metric-grid";
import { formatPKR, getImportedReportSummary } from "@/lib/dashboard-data";

type ImportedReportSummary = Awaited<ReturnType<typeof getImportedReportSummary>>;

export default function ImportedNetworkReports({ reports }: { reports: ImportedReportSummary }) {
  if (!reports.collections.records && !reports.expenses.records && !reports.staff.records) return null;

  return (
    <section className="mb-6 rounded-2xl border border-[#dce8dc] bg-[#f8fbf7] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#5c785e]">Imported source data</p>
        <h2 className="mt-1 text-xl font-bold text-[#203526]">Network monthly reports</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#718073]">
          Historical reports across {reports.reportingCityCount.toLocaleString("en-PK")} reporting cities. These source totals are shown separately from transaction-level verification and reconciliation.
        </p>
      </div>
      <MetricGrid columns={4} items={[
        { label: "Collection report rows", value: reports.collections.records.toLocaleString("en-PK"), note: reports.collections.firstMonth && reports.collections.latestMonth ? `${reports.collections.firstMonth.slice(0, 7)} to ${reports.collections.latestMonth.slice(0, 7)}` : "No reporting period", icon: "wallet", tone: "blue" },
        { label: "Reported collections", value: formatPKR(reports.collections.amount), note: "Imported monthly reports", icon: "cash", tone: "green" },
        { label: "Reported expenses", value: formatPKR(reports.expenses.amount), note: `${reports.expenses.records.toLocaleString("en-PK")} source rows`, icon: "chart", tone: "orange" },
        { label: "Latest reported staff", value: reports.staff.latestTotal.toLocaleString("en-PK"), note: reports.staff.latestMonth ? `${reports.staff.latestCities} cities · ${reports.staff.latestMonth.slice(0, 7)}` : "No staff snapshot", icon: "users", tone: "purple" },
      ]} />
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartPanel title="Reported collections by month" description="Source totals from the latest 12 available months.">
          <BreakdownBarChart data={reports.collections.monthly.slice(-12).map((item) => ({ name: item.label, value: item.value }))} valueFormat="currency" height={250} />
        </ChartPanel>
        <ChartPanel title="Reported expenses by category" description="Imported expense totals grouped by source category.">
          <BreakdownBarChart data={reports.expenses.categories} valueFormat="currency" horizontal height={250} />
        </ChartPanel>
        <ChartPanel title="Latest staff by city" description={reports.staff.latestMonth ? `Reported headcount for ${reports.staff.latestMonth.slice(0, 7)}.` : "No staff snapshots available."}>
          <BreakdownBarChart data={reports.staff.cities} horizontal height={250} />
        </ChartPanel>
      </div>
    </section>
  );
}

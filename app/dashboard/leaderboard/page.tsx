import {
  BreakdownBarChart,
  ChartLegend,
  StatusDonutChart,
} from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { countBy } from "@/lib/analytics";
import { formatPKR } from "@/lib/dashboard-data";
import { getPartnerLeaderboardData } from "@/lib/partner-leaderboard";
import { connection } from "next/server";

export const metadata = {
  title: "Partner Leaderboard | Super Admin",
  description:
    "Internal partner collection, box status, and relationship ranking overview.",
};

const collectionStatusColors = {
  Verified: "#276431",
  "Pending Verification": "#d99a38",
  Flagged: "#b94b42",
};

const boxStatusColors = {
  Active: "#276431",
  Inactive: "#9aa69a",
  Damaged: "#b94b42",
  "Under Review": "#d99a38",
};

export default async function AdminPartnerLeaderboardPage() {
  await connection();
  const records = await getDashboardRecords(["cities", "partners", "collections", "donationBoxes"] as const);
  const data = getPartnerLeaderboardData(records);
  const partnershipStatusData = countBy(
    data.partners,
    "partnership_status",
  );
  const collectionStatusData = data.collectionStatusData.map((item) => ({
    ...item,
    color: collectionStatusColors[item.name],
  }));
  const boxStatusData = data.boxStatusData.map((item) => ({
    ...item,
    color: boxStatusColors[item.name],
  }));

  return (
    <>
      <PageHeading
        eyebrow="Internal partner performance"
        title="Partner Leaderboard"
        description="Review verified collections alongside pending funds, box health, and partner relationship status."
      />
      <DemoNotice />

      <MetricGrid
        items={[
          {
            label: "Partner records",
            value: data.totalPartners.toLocaleString("en-PK"),
            note: "All relationship stages",
            icon: "handshake",
            tone: "blue",
          },
          {
            label: "Verified partner funds",
            value: formatPKR(data.totals.Verified.amount),
            note: `${data.totals.Verified.count.toLocaleString("en-PK")} verified collections`,
            icon: "cash",
            tone: "green",
          },
          {
            label: "Pending verification",
            value: formatPKR(data.totals["Pending Verification"].amount),
            note: `${data.totals["Pending Verification"].count.toLocaleString("en-PK")} records awaiting review`,
            icon: "clock",
            tone: "orange",
          },
          {
            label: "Flagged collections",
            value: data.totals.Flagged.count.toLocaleString("en-PK"),
            note: `${formatPKR(data.totals.Flagged.amount)} needs follow-up`,
            icon: "alert",
            tone: "red",
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartPanel
          title="Verified collections by partner"
          description="Ranked by collected PKR. Pending and flagged amounts are excluded."
        >
          <BreakdownBarChart
            data={data.verifiedByPartner}
            valueFormat="currency"
            horizontal
            height={360}
          />
        </ChartPanel>
        <ChartPanel
          title="Verified collections by city"
          description="Partner-linked verified collection amounts by collection location."
        >
          <BreakdownBarChart
            data={data.verifiedByCity}
            valueFormat="currency"
            horizontal
            height={300}
          />
        </ChartPanel>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartPanel
          title="Collection verification"
          description="Partner-linked collection records by verification status."
        >
          <StatusDonutChart data={collectionStatusData} height={230} />
          <ChartLegend data={collectionStatusData} />
        </ChartPanel>
        <ChartPanel
          title="Partner box status"
          description={`${data.totalPartnerBoxes.toLocaleString("en-PK")} boxes assigned to partners.`}
        >
          <StatusDonutChart data={boxStatusData} height={230} />
          <ChartLegend data={boxStatusData} />
        </ChartPanel>
        <ChartPanel
          title="Partnership status"
          description="Current relationship stage across partner records."
        >
          <StatusDonutChart data={partnershipStatusData} height={230} />
          <ChartLegend data={partnershipStatusData} />
        </ChartPanel>
      </div>

      <RecordExplorer
        title="Partner performance register"
        description="Search, filter, sort, and expand partners to compare their collection and box status totals."
        records={data.partners}
        columns={[
          { key: "rank", label: "Rank" },
          { key: "partner_name", label: "Partner" },
          { key: "city_name", label: "HQ city" },
          { key: "partnership_status", label: "Relationship" },
          { key: "installed_boxes", label: "Boxes" },
          { key: "active_boxes", label: "Active" },
          { key: "verified_amount_pkr", label: "Verified PKR" },
          { key: "pending_amount_pkr", label: "Pending PKR" },
          { key: "flagged_amount_pkr", label: "Flagged PKR" },
        ]}
        statusKey="partnership_status"
        cityKey="city_id"
        cities={records.cities}
        initialSortDirection="asc"
      />
    </>
  );
}

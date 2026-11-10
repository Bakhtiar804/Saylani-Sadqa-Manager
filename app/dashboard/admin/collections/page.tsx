import { connection } from "next/server";
import { getCollectionExplorerPage, getFieldCollectionExplorerPage } from "@/lib/dashboard-data";
import { getAdminCity, getAdminRecords } from "../admin-data";
import DemoNotice from "@/components/dashboard/demo-notice";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import CityCollectionRegister from "@/components/dashboard/city-collection-register";

export default async function AdminCollectionsPage() {
  await connection();
  const cityId = await getAdminCity();
  if (!cityId) return <PageHeading eyebrow="Admin workspace" title="Collections" description="A Super Admin must assign a city to your account before city records are available."/>;
  const [initial, fieldLogs, { records }] = await Promise.all([
    getCollectionExplorerPage({ city: cityId, page: 1 }),
    getFieldCollectionExplorerPage({ city: cityId, page: 1 }),
    getAdminRecords(["cities"] as const),
  ]);
  const cities = records?.cities ?? [];
  const statuses = ["Verified", "Pending Verification", "Flagged"];

  return (
    <>
      <PageHeading eyebrow="Collection operations" title="Collections" description="Review rider submissions and see field visit details for your city." />
      <DemoNotice />
      <CityCollectionRegister
        collections={
          <RecordExplorer
            title="Rider submissions"
            description="Open a submission to verify or flag it."
            records={initial.records}
            totalRecords={initial.totalRecords}
            remoteEndpoint="/api/dashboard/admin/collections"
            remoteStatuses={statuses}
            columns={[
              { key: "collection_id", label: "Collection ID" },
              { key: "collection_date", label: "Date" },
              { key: "city_id", label: "City" },
              { key: "collection_amount_pkr", label: "Amount" },
              { key: "collection_status", label: "Status" },
            ]}
            statusKey="collection_status"
            dateKey="collection_date"
            cities={cities}
            allowCollectionReview
          />
        }
        fieldVisits={
          <RecordExplorer
            title="Field visit details"
            description="Open a visit to see cash counts, box condition, and seal details."
            records={fieldLogs.records}
            totalRecords={fieldLogs.totalRecords}
            remoteEndpoint="/api/dashboard/admin/collections/field-logs"
            remoteStatuses={statuses}
            columns={[
              { key: "field_collection_id", label: "Field record" },
              { key: "collection_date", label: "Date" },
              { key: "city_id", label: "City" },
              { key: "total_cash_counted_pkr", label: "Cash counted" },
              { key: "collection_status", label: "Status" },
            ]}
            statusKey="collection_status"
            dateKey="collection_date"
            cities={cities}
          />
        }
      />
    </>
  );
}

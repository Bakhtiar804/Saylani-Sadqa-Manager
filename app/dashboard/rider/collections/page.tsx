import { connection } from "next/server";
import { getRiderDashboard, getRiderSession } from "@/lib/rider-dashboard";
import DemoNotice from "@/components/dashboard/demo-notice";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";

export default async function RiderCollectionsPage() {
  await connection();
  const session = await getRiderSession();
  const data = await getRiderDashboard(session.userId);
  if (!data) return <PageHeading eyebrow="Rider workspace" title="My Collections" description="Your login is not linked to a rider profile yet."/>;
  return <><PageHeading eyebrow={`${data.profile.city_name || "City not assigned"} · ${data.profile.assigned_zone}`} title="My Collections" description="Review collection submissions and field visit logs linked to your rider account."/><DemoNotice/><div className="mb-6"><RecordExplorer title="My collection records" description="Latest collection entries recorded for your rider account." records={data.collections} columns={[{ key: "collection_id", label: "Collection ID" }, { key: "collection_date", label: "Date" }, { key: "box_id", label: "Box ID" }, { key: "collection_amount_pkr", label: "Amount" }, { key: "collection_status", label: "Status" }, { key: "cash_handover_status", label: "Handover" }, { key: "deposit_status", label: "Deposit" }]} statusKey="collection_status" dateKey="collection_date"/></div><RecordExplorer title="My field visit logs" description="Latest cash count and visit records linked to your rider account." records={data.fieldLogs} columns={[{ key: "field_collection_id", label: "Field record" }, { key: "collection_date", label: "Date" }, { key: "box_id", label: "Box ID" }, { key: "area", label: "Area" }, { key: "total_cash_counted_pkr", label: "Cash counted" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date"/></>;
}

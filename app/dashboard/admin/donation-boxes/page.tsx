import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import BoxRegistrationForm from "@/components/dashboard/box-registration-form";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getAdminRecords } from "../admin-data";
import { getDonationBoxPageData } from "@/lib/donation-boxes";

export default async function CityAdminDonationBoxesPage() {
  await connection();
  const { cityId, records } = await getAdminRecords(["cities"] as const);
  if (!cityId || !records) return <PageHeading eyebrow="City Admin workspace" title="Donation Boxes" description="A city assignment is required to manage boxes."/>;
  const data = await getDonationBoxPageData(cityId, null);
  return <>
    <PageHeading eyebrow="Box management" title="Donation Boxes" description="Register boxes and manage every box in your assigned city."/>
    <BoxRegistrationForm fixedCityId={cityId} cities={records.cities} {...data}/>
    <RecordExplorer title="City donation box register" description="All registered donation boxes in your assigned city." records={data.boxes} columns={[{key:"box_id",label:"Box ID"},{key:"qr_code",label:"QR code"},{key:"area",label:"Area"},{key:"location_type",label:"Location type"},{key:"branch_id",label:"Branch"},{key:"box_status",label:"Status"},{key:"last_verified_date",label:"Last checked"}]} statusKey="box_status" dateKey="installation_date" cities={records.cities} allowBoxStatusChange/>
  </>;
}

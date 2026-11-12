import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import BoxRegistrationForm from "@/components/dashboard/box-registration-form";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { getActiveTeamBranch } from "@/lib/city-branches";
import { getDonationBoxPageData } from "@/lib/donation-boxes";
import { getManagerSession } from "../../admin/admin-data";

export default async function BranchAdminDonationBoxesPage() {
  await connection();
  const session = await getManagerSession();
  if (!session.cityId) return <PageHeading eyebrow="Branch Admin workspace" title="Donation Boxes" description="A city assignment is required to manage branch boxes."/>;
  const [assignedBranch, { cities }] = await Promise.all([
    getActiveTeamBranch(session.userId, session.cityId), getDashboardRecords(["cities"] as const),
  ]);
  if (!assignedBranch) return <>
    <PageHeading eyebrow="Branch Admin workspace" title="Donation Boxes" description="An active branch assignment is required."/>
    <section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">Active branch assignment required</h2><p className="mt-2 text-sm text-[#657568]">Ask your City Admin to assign your account to an active branch.</p></section>
  </>;
  const data = await getDonationBoxPageData(session.cityId, assignedBranch);
  return <>
    <PageHeading eyebrow={`${assignedBranch.branchName} · Box management`} title="Donation Boxes" description="Register boxes and manage boxes assigned to your branch."/>
    <BoxRegistrationForm fixedCityId={session.cityId} cities={cities.filter((city) => city.city_id === session.cityId)} {...data}/>
    <RecordExplorer title="Branch donation box register" description={`Boxes assigned to ${assignedBranch.branchName}.`} records={data.boxes} columns={[{key:"box_id",label:"Box ID"},{key:"qr_code",label:"QR code"},{key:"area",label:"Area"},{key:"location_type",label:"Location type"},{key:"box_status",label:"Status"},{key:"last_verified_date",label:"Last checked"}]} statusKey="box_status" dateKey="installation_date" cities={cities.filter((city) => city.city_id === session.cityId)} allowBoxStatusChange/>
  </>;
}

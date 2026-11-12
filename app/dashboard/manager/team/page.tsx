import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import TeamAccountManagement from "@/components/dashboard/team-account-management";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { listTeamAccounts } from "@/lib/admin-accounts";
import { getActiveTeamBranch } from "@/lib/city-branches";
import { getManagerSession } from "../../admin/admin-data";

export default async function ManagerTeamPage() {
  await connection();
  const session = await getManagerSession();
  if (!session.cityId) return <><PageHeading eyebrow="Team management" title="Team Accounts" description="Assign a city to your account to manage your rider team."/><section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">City assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask a Super Admin to assign a city, then sign in again.</p></section></>;
  const [accounts, { cities }, assignedBranch] = await Promise.all([
    listTeamAccounts(session), getDashboardRecords(["cities"] as const), getActiveTeamBranch(session.userId, session.cityId),
  ]);
  const cityName = cities.find((city) => city.city_id === session.cityId)?.city_name ?? "Assigned city";
  if (!assignedBranch) return <>
    <PageHeading eyebrow={`${cityName} · Team management`} title="Team Accounts" description="A branch assignment is required before managing Riders."/>
    <section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">Active branch assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask your City Admin to assign your account to an active branch, then sign in again.</p></section>
  </>;
  return <><PageHeading eyebrow={`${cityName} · ${assignedBranch.branchName}`} title="Team Accounts" description={`Create Rider logins for ${assignedBranch.branchName}.`}/><div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">New Riders are assigned to your branch. Your directory shows Riders assigned to this branch.</div><TeamAccountManagement actorRole="city_manager" initialAccounts={accounts} cities={[]} branches={[]} assignedCity={{ cityId: session.cityId, cityName }} assignedBranch={assignedBranch}/></>;
}

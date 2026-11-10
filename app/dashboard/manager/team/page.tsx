import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import TeamAccountManagement from "@/components/dashboard/team-account-management";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { listTeamAccounts } from "@/lib/admin-accounts";
import { getManagerSession } from "../../admin/admin-data";

export default async function ManagerTeamPage() {
  await connection();
  const session = await getManagerSession();
  if (!session.cityId) return <><PageHeading eyebrow="City Manager workspace" title="Rider Accounts" description="Manage rider accounts once a city is assigned to you."/><section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">City assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask a Super Admin to assign a city to your account.</p></section></>;
  const [accounts, { cities }] = await Promise.all([
    listTeamAccounts(session), getDashboardRecords(["cities"] as const),
  ]);
  const cityName = cities.find((city) => city.city_id === session.cityId)?.city_name ?? "Assigned city";
  return <><PageHeading eyebrow="City Manager workspace" title="Rider Accounts" description={`Create and manage rider logins for ${cityName}.`}/><div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">New rider accounts are assigned to your city.</div><TeamAccountManagement actorRole="city_manager" initialAccounts={accounts} cities={[]} assignedCity={{ cityId: session.cityId, cityName }}/></>;
}

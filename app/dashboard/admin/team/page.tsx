import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import TeamAccountManagement from "@/components/dashboard/team-account-management";
import { getCityOptions } from "@/lib/dashboard-data";
import { listActiveTeamBranches, listTeamAccounts } from "@/lib/admin-accounts";
import { getAdminSession } from "../admin-data";

export default async function AdminTeamPage() {
  await connection();
  const session = await getAdminSession();
  if (!session.cityId) return <><PageHeading eyebrow="Team management" title="Team Accounts" description="Assign a city to your account before creating city-scoped accounts."/><section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">City assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask a Super Admin to assign a city, then sign in again.</p></section></>;
  const [accounts, cities, branches] = await Promise.all([
    listTeamAccounts(session), getCityOptions(), listActiveTeamBranches(session.cityId),
  ]);
  const cityName = cities.find((city) => city.city_id === session.cityId)?.city_name ?? "City assignment required";
  return <><PageHeading eyebrow="Team management" title="Team Accounts" description={`Create Branch Admin and Rider logins for your assigned city.`}/><div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">New accounts stay within your assigned city. City Admin accounts can be created only by a Super Admin.</div><TeamAccountManagement actorRole="admin" initialAccounts={accounts} cities={cities} branches={branches} assignedCity={session.cityId ? { cityId: session.cityId, cityName } : null}/></>;
}

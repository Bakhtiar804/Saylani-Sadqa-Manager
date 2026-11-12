import { connection } from "next/server";
import PageHeading from "@/components/dashboard/page-heading";
import CityBranchManagement from "@/components/dashboard/city-branch-management";
import { listCityBranches } from "@/lib/city-branches";
import { getCityOptions } from "@/lib/dashboard-data";
import { getAdminSession } from "../admin-data";

export default async function AdminBranchesPage() {
  await connection();
  const session = await getAdminSession();
  if (!session.cityId) return <>
    <PageHeading eyebrow="Branch management" title="Branches" description="Assign a city to your account before managing branches."/>
    <section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">City assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask a Super Admin to assign a city, then sign in again.</p></section>
  </>;

  const [branches, cities] = await Promise.all([listCityBranches(session.cityId), getCityOptions()]);
  const cityName = cities.find((city) => city.city_id === session.cityId)?.city_name ?? "Your city";
  return <>
    <PageHeading eyebrow={`${cityName} · Branch management`} title="Branches" description="Create branches and review the locations assigned to your city."/>
    <CityBranchManagement cityName={cityName} initialBranches={branches}/>
  </>;
}

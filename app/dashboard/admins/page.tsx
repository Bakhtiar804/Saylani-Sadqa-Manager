import TeamAccountManagement from "@/components/dashboard/team-account-management";
import PageHeading from "@/components/dashboard/page-heading";
import { listTeamAccounts } from "@/lib/admin-accounts";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const metadata = {
  title: "Team Accounts | Saylani Sadqa Manager",
  description: "Create and review role accounts.",
};

export default async function AdminManagementPage() {
  await connection();
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) redirect("/sign-in");
  if (session.role !== "super_admin") redirect("/dashboard");

  const [accounts, { cities }] = await Promise.all([
    listTeamAccounts(session), getDashboardRecords(["cities"] as const),
  ]);

  return (
    <>
      <PageHeading
        eyebrow="Access administration"
        title="Team Accounts"
        description="Create Admin, City Manager, and Rider logins with a city assignment."
      />
      <div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">
        Super Admins can create Admin, City Manager, and Rider accounts. City
        Managers and Riders are linked to the city selected below.
      </div>
      <TeamAccountManagement actorRole="super_admin" initialAccounts={accounts} cities={cities} assignedCity={null} />
    </>
  );
}

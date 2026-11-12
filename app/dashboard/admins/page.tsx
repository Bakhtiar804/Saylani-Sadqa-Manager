import TeamAccountManagement from "@/components/dashboard/team-account-management";
import PageHeading from "@/components/dashboard/page-heading";
import { listTeamAccounts, isCurrentLoginSession } from "@/lib/admin-accounts";
import { getCityOptions } from "@/lib/dashboard-data";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";

export const metadata = {
  title: "Team Accounts | Saylani Sadqa Manager",
  description: "Create and review role accounts.",
};

export default function AdminManagementPage() {
  return <Suspense fallback={<DashboardSkeleton />}><AdminManagementContent /></Suspense>;
}

async function AdminManagementContent() {
  await connection();
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) redirect("/sign-in");
  if (session.role !== "super_admin") redirect("/dashboard");

  const [accounts, cities] = await Promise.all([
    listTeamAccounts(session), getCityOptions(),
  ]);

  return (
    <>
      <PageHeading
        eyebrow="Access administration"
        title="Team Accounts"
        description="Create City Admin logins and manage team accounts across cities."
      />
      <div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">
        Create City Admin accounts here. Edit or remove City Admin, Branch Admin
        and Rider accounts from the team directory below.
      </div>
      <TeamAccountManagement actorRole="super_admin" initialAccounts={accounts} cities={cities} assignedCity={null} />
    </>
  );
}

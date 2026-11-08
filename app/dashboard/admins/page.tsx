import AdminManagement from "@/components/dashboard/admin-management";
import PageHeading from "@/components/dashboard/page-heading";
import { listAdminAccounts } from "@/lib/admin-accounts";
import { getSuperAdminEmail } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Management | Saylani Sadqa Manager",
  description: "Create and review dashboard administrator accounts.",
};

export default async function AdminManagementPage() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) redirect("/sign-in");
  if (session.role !== "super_admin") redirect("/dashboard");

  const admins = await listAdminAccounts(getSuperAdminEmail());

  return (
    <>
      <PageHeading
        eyebrow="Access administration"
        title="Admin Management"
        description="Create dashboard administrator accounts and review the accounts currently configured for this application."
      />
      <div className="mb-6 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-sm leading-6 text-[#536455]">
        Existing sample users are not included here. This list contains the
        configured super-admin account and real admin accounts saved in
        PostgreSQL.
      </div>
      <AdminManagement initialAdmins={admins} />
    </>
  );
}

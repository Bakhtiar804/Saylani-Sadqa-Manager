import type { ReactNode } from "react";
import AdminShell from "@/components/dashboard/admin-shell";
import { verifyUserSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isCurrentLoginSession } from "@/lib/admin-accounts";

export const metadata = {
  title: "Dashboard | Saylani Sadqa Manager",
  description: "Monthly donation reports and field operations dashboard.",
};

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await connection();
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) {
    redirect("/sign-in");
  }

  return (
    <AdminShell
      canManageAdmins={session.role === "super_admin"}
      userName={session.name}
      userRole={session.role}
    >
      {children}
    </AdminShell>
  );
}

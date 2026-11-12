import {Suspense,type ReactNode} from "react";
import DashboardSkeleton from '@/components/dashboard/dashboard-skeleton';
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

export default function DashboardLayout({children}:{children:ReactNode}) {
  return <Suspense fallback={<div className="p-6"><DashboardSkeleton/></div>}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}

async function AuthenticatedDashboard({ children }: { children: ReactNode }) {
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
      <Suspense fallback={<DashboardSkeleton/>}>{children}</Suspense>
    </AdminShell>
  );
}

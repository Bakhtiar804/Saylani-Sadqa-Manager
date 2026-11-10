import type { ReactNode } from "react";
import AdminShell from "@/components/dashboard/admin-shell";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOperationsSession } from "@/lib/operations-auth";
import { getRiderTaskNotifications } from "@/lib/rider-dashboard";
import RiderNotificationBell from "@/components/dashboard/rider-notification-bell";

export const metadata = {
  title: "Dashboard | Saylani Sadqa Manager",
  description: "Sadqa box collections and operations demo dashboard.",
};

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await getOperationsSession();
  if (!session) {
    redirect("/sign-in");
  }
  const notifications = session.role === "rider" ? await getRiderTaskNotifications(session.userId) : null;

  return (
    <AdminShell
      canManageAdmins={session.role === "super_admin"}
      userName={session.name}
      userRole={session.role}
      notifications={notifications && <RiderNotificationBell initialNotifications={notifications} />}
    >
      {children}
    </AdminShell>
  );
}

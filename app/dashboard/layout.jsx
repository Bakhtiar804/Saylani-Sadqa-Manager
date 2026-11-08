import AdminShell from "@/components/dashboard/admin-shell";

export const metadata = {
  title: "Super Admin Dashboard | Saylani Sadqa Manager",
  description: "Sadqa box collections and operations demo dashboard.",
};

export default function DashboardLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}

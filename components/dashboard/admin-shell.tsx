import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

export default function AdminShell({
  children,
  canManageAdmins,
}: {
  children: ReactNode;
  canManageAdmins: boolean;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf5] font-sans text-[#192d21]">
      <Sidebar canManageAdmins={canManageAdmins} />
      <div className="ml-[258px] min-h-screen w-[calc(100%-258px)] max-[1100px]:ml-[220px] max-[1100px]:w-[calc(100%-220px)] max-[900px]:ml-[72px] max-[900px]:w-[calc(100%-72px)] max-[600px]:mb-[72px] max-[600px]:ml-0 max-[600px]:w-full">
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] px-10 pb-8 pt-8 max-[1100px]:px-6 max-[600px]:px-4 max-[600px]:pt-5">
          {children}
        </main>
      </div>
    </div>
  );
}

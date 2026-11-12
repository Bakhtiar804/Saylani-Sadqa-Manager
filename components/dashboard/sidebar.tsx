"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/landing/brand";
import {
  adminDashboardModules,
  cityManagerDashboardModules,
  dashboardModules,
  riderDashboardModules,
} from "./navigation";
import Icon from "./icons";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "City Admin",
  city_manager: "Branch Admin",
  rider: "Rider",
};

export default function Sidebar({
  canManageAdmins,
  userName,
  userRole,
}: {
  canManageAdmins: boolean;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const modules =
    userRole === "admin"
      ? adminDashboardModules
      : userRole === "city_manager"
        ? cityManagerDashboardModules
        : userRole === "rider"
          ? riderDashboardModules
          : dashboardModules;
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[258px] flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:thin] [scrollbar-color:#61bb46_transparent] border-r border-[#e5ece2] bg-white px-4 py-6 max-[1100px]:w-[220px] max-[900px]:w-[72px] max-[900px]:items-center max-[900px]:px-2 max-[600px]:inset-x-0 max-[600px]:bottom-0 max-[600px]:top-auto max-[600px]:h-[72px] max-[600px]:w-full max-[600px]:flex-row max-[600px]:justify-center max-[600px]:overflow-y-visible max-[600px]:border-r-0 max-[600px]:border-t max-[600px]:px-1 max-[600px]:py-1">
      <Link
        href="/dashboard"
        className="mb-8 flex h-[46px] shrink-0 items-center px-2.5 max-[900px]:justify-center max-[900px]:px-0 max-[600px]:hidden"
        aria-label="Saylani Sadqa Manager overview"
      >
        <span className="relative shrink-0 max-[900px]:hidden">
          <Brand className="w-[190px] object-contain object-left max-[1100px]:w-[165px]" />
        </span>
        <span className="hidden size-10 shrink-0 overflow-hidden max-[900px]:block">
          <Brand className="w-[177px] max-w-none object-contain object-left" />
        </span>
      </Link>
      <p className="mb-2.5 px-3 text-[11px] font-bold tracking-[.12em] text-[#758375] max-[900px]:hidden">
        WORKSPACE
      </p>
      <nav
        aria-label="Main navigation"
        className="grid w-full shrink-0 gap-1 max-[900px]:w-full max-[600px]:flex max-[600px]:max-w-[760px] max-[600px]:shrink max-[600px]:justify-start max-[600px]:overflow-x-auto"
      >
        {modules.map((item) => {
          const active =
            item.href === "/dashboard" ||
            item.href === "/dashboard/admin" ||
            item.href === "/dashboard/manager" ||
            item.href === "/dashboard/rider" ||
            item.href === "/leaderboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`group relative flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold transition duration-200 hover:translate-x-0.5 hover:bg-[#f4f8f2] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:w-[70px] max-[600px]:min-w-[70px] max-[600px]:shrink-0 max-[600px]:min-h-[58px] max-[600px]:flex-col max-[600px]:gap-1 max-[600px]:px-1 max-[600px]:text-[10px] ${active ? "bg-[#edf6e9] text-[#276431] before:absolute before:-left-4 before:h-7 before:w-[3px] before:rounded-r before:bg-[#61bb46] max-[900px]:before:-left-[9px] max-[600px]:before:-top-1 max-[600px]:before:left-1/2 max-[600px]:before:h-[3px] max-[600px]:before:w-6 max-[600px]:before:-translate-x-1/2" : "text-[#627165]"}`}
            >
              <Icon name={item.icon} size={19} />
              <span className="max-[900px]:hidden max-[600px]:block max-[600px]:whitespace-nowrap">
                {item.mobileLabel || item.label}
              </span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/insights"
          aria-current={pathname === "/dashboard/insights" ? "page" : undefined}
          aria-label="Open Saylani AI"
          title="Saylani AI"
          className={`group relative mt-2 flex min-h-[48px] items-center gap-3 overflow-hidden rounded-[10px] border border-[#d9ead2] bg-gradient-to-r from-[#f0f9eb] to-[#fffaf0] px-3 text-left text-[14px] font-bold text-[#276431] transition hover:-translate-y-0.5 hover:border-[#b7d8ad] hover:shadow-[0_8px_20px_rgba(69,125,60,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:mt-0 max-[600px]:w-[70px] max-[600px]:min-w-[70px] max-[600px]:shrink-0 max-[600px]:min-h-[58px] max-[600px]:flex-col max-[600px]:gap-1 max-[600px]:text-[10px] ${pathname === "/dashboard/insights" ? "ring-2 ring-[#61bb46]/30" : ""}`}
        >
          <span className="grid size-7 place-items-center rounded-lg bg-[#dff1d8] text-[#276431] max-[600px]:size-6">
            <Icon name="spark" size={16} />
          </span>
          <span className="max-[900px]:hidden max-[600px]:block max-[600px]:whitespace-nowrap">Saylani AI</span>
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#d4a63b] max-[900px]:hidden" />
        </Link>
        {canManageAdmins && (
          <Link
            href="/dashboard/admins"
            aria-label="City Admin Management"
            aria-current={
              pathname.startsWith("/dashboard/admins") ? "page" : undefined
            }
            title="City Admin Management"
            className={`group relative flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold transition duration-200 hover:bg-[#f4f8f2] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:w-[70px] max-[600px]:min-w-[70px] max-[600px]:shrink-0 max-[600px]:min-h-[58px] max-[600px]:flex-col max-[600px]:gap-1 max-[600px]:px-1 max-[600px]:text-[10px] ${pathname.startsWith("/dashboard/admins") ? "bg-[#edf6e9] text-[#276431] before:absolute before:-left-4 before:h-7 before:w-[3px] before:rounded-r before:bg-[#61bb46] max-[900px]:before:-left-[9px] max-[600px]:before:-top-1 max-[600px]:before:left-1/2 max-[600px]:before:h-[3px] max-[600px]:before:w-6 max-[600px]:before:-translate-x-1/2" : "text-[#627165]"}`}
          >
            <Icon name="users" size={19} />
            <span className="max-[900px]:hidden max-[600px]:block max-[600px]:whitespace-nowrap">
              City Admins
            </span>
          </Link>
        )}
      </nav>
      <div className="mt-auto w-full shrink-0 max-[600px]:hidden">
        <div className="mb-4 rounded-[13px] border border-[#e3eddf] bg-gradient-to-br from-[#f4f9f0] to-[#fbfdf9] p-3.5 max-[900px]:hidden">
          <span className="mb-3 grid size-[28px] place-items-center rounded-lg bg-[#e4f2dc] text-lg text-[#276431]">
            ✳
          </span>
          <b className="text-[13px] text-[#203a27]">Need a hand?</b>
          <p className="my-1.5 text-xs leading-relaxed text-[#657568]">
            Monthly source reports and individual field records are available in your workspace.
          </p>
          <span className="text-xs font-semibold text-[#276431]">
            Donation operations
          </span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-[#edf1eb] px-1 pt-3.5 max-[900px]:justify-center">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#e4eedf] bg-[#dcebd5] text-[11px] font-extrabold text-[#276431]">
            {initials || "U"}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1 max-[900px]:hidden">
            <b className="truncate text-xs text-[#2a3c2e]">{userName}</b>
            <small className="text-[11px] text-[#718073]">
              {roleLabels[userRole] ?? userRole}
            </small>
          </span>
        </div>
      </div>
    </aside>
  );
}

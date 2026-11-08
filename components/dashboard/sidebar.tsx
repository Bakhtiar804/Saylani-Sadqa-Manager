"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardModules } from "./navigation";
import Icon from "./icons";

export default function Sidebar({ canManageAdmins }: { canManageAdmins: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[258px] flex-col border-r border-[#e5ece2] bg-white px-4 py-6 max-[1100px]:w-[220px] max-[900px]:w-[72px] max-[900px]:items-center max-[900px]:px-2 max-[600px]:inset-x-0 max-[600px]:bottom-0 max-[600px]:top-auto max-[600px]:h-[72px] max-[600px]:w-full max-[600px]:flex-row max-[600px]:justify-center max-[600px]:border-r-0 max-[600px]:border-t max-[600px]:px-1 max-[600px]:py-1">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2.5 max-[900px]:px-0 max-[600px]:hidden" aria-label="Saylani Sadqa Manager overview">
        <span className="grid size-10 place-items-center rounded-xl bg-[#276431] font-serif text-2xl text-white">س</span>
        <span className="flex flex-col text-[13px] font-extrabold tracking-[.08em] text-[#192d21]">SAYLANI<small className="mt-0.5 text-[9px] tracking-[.15em] text-[#718073]">SADQA MANAGER</small></span>
      </Link>
      <p className="mb-2.5 px-3 text-[11px] font-bold tracking-[.12em] text-[#758375] max-[900px]:hidden">WORKSPACE</p>
      <nav aria-label="Main navigation" className="grid w-full gap-1 max-[900px]:w-full max-[600px]:flex max-[600px]:max-w-[760px] max-[600px]:justify-start max-[600px]:overflow-x-auto">
        {dashboardModules.map((item) => {
          const active = item.href === "/dashboard" || item.href === "/leaderboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} title={item.label} className={`group relative flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold transition duration-200 hover:translate-x-0.5 hover:bg-[#f4f8f2] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:w-[70px] max-[600px]:min-w-[70px] max-[600px]:shrink-0 max-[600px]:min-h-[58px] max-[600px]:flex-col max-[600px]:gap-1 max-[600px]:px-1 max-[600px]:text-[10px] ${active ? "bg-[#edf6e9] text-[#276431] before:absolute before:-left-4 before:h-7 before:w-[3px] before:rounded-r before:bg-[#61bb46] max-[900px]:before:-left-[9px] max-[600px]:before:-top-1 max-[600px]:before:left-1/2 max-[600px]:before:h-[3px] max-[600px]:before:w-6 max-[600px]:before:-translate-x-1/2" : "text-[#627165]"}`}>
            <Icon name={item.icon} size={19}/><span className="max-[900px]:hidden max-[600px]:block max-[600px]:whitespace-nowrap">{item.mobileLabel || item.label}</span>
          </Link>;
        })}
        {canManageAdmins && (
          <Link
            href="/dashboard/admins"
            aria-label="Admin Management"
            aria-current={pathname.startsWith("/dashboard/admins") ? "page" : undefined}
            title="Admin Management"
            className={`group relative flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold transition duration-200 hover:bg-[#f4f8f2] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:w-[70px] max-[600px]:min-w-[70px] max-[600px]:shrink-0 max-[600px]:min-h-[58px] max-[600px]:flex-col max-[600px]:gap-1 max-[600px]:px-1 max-[600px]:text-[10px] ${pathname.startsWith("/dashboard/admins") ? "bg-[#edf6e9] text-[#276431] before:absolute before:-left-4 before:h-7 before:w-[3px] before:rounded-r before:bg-[#61bb46] max-[900px]:before:-left-[9px] max-[600px]:before:-top-1 max-[600px]:before:left-1/2 max-[600px]:before:h-[3px] max-[600px]:before:w-6 max-[600px]:before:-translate-x-1/2" : "text-[#627165]"}`}
          >
            <Icon name="users" size={19} />
            <span className="max-[900px]:hidden max-[600px]:block max-[600px]:whitespace-nowrap">
              Admins
            </span>
          </Link>
        )}
      </nav>
      <div className="mt-auto w-full max-[600px]:hidden">
        <div className="mb-4 rounded-[13px] border border-[#e3eddf] bg-gradient-to-br from-[#f4f9f0] to-[#fbfdf9] p-3.5 max-[900px]:hidden"><span className="mb-3 grid size-[28px] place-items-center rounded-lg bg-[#e4f2dc] text-lg text-[#276431]">✳</span><b className="text-[13px] text-[#203a27]">Need a hand?</b><p className="my-1.5 text-xs leading-relaxed text-[#657568]">Your workspace is using fictional demo records.</p><span className="text-xs font-semibold text-[#276431]">Demo environment</span></div>
        <div className="flex items-center gap-2.5 border-t border-[#edf1eb] px-1 pt-3.5 max-[900px]:justify-center"><span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#e4eedf] bg-[#dcebd5] text-[11px] font-extrabold text-[#276431]">SA</span><span className="flex flex-1 flex-col gap-1 max-[900px]:hidden"><b className="text-xs text-[#2a3c2e]">Super Admin</b><small className="text-[11px] text-[#718073]">Administrator</small></span></div>
      </div>
    </aside>
  );
}

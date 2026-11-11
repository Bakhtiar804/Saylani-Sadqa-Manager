import Link from "next/link";
import { Brand } from "@/components/landing/brand";
import Icon from "./icons";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "City Admin",
  city_manager: "Branch Admin",
  rider: "Rider",
};

export default function Topbar({ userRole }: { userRole: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e7ede5] bg-white/95 px-10 backdrop-blur-xl max-[1100px]:px-6 max-[600px]:h-[60px] max-[600px]:px-4">
      <Link href="/dashboard" className="hidden items-center max-[600px]:flex" aria-label="Saylani Sadqa Manager overview">
        <Brand className="w-32 max-[380px]:w-28" />
      </Link>
      <div className="flex items-center gap-2.5 text-sm text-[#718073] max-[600px]:hidden">
        <span className="grid size-8 place-items-center rounded-lg bg-[#edf6e9] text-[#276431]">
          <Icon name="grid" size={17} />
        </span>
        <span className="font-semibold text-[#344639]">
          {roleLabels[userRole] ?? userRole} Workspace
        </span>
      </div>
      <div className="flex items-center gap-3 max-[600px]:gap-2">
        <span className="rounded-full border border-[#dce8dc] bg-[#f5faf2] px-3 py-1.5 text-xs font-semibold text-[#276431] max-[600px]:hidden">
          DEMO DATA
        </span>
        <span className="hidden text-xs text-[#718073] sm:inline max-[600px]:hidden">
          Saylani Sadqa Manager
        </span>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-[#dce8dc] px-3 py-2 text-xs font-semibold text-[#276431] transition hover:bg-[#f5faf2]"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

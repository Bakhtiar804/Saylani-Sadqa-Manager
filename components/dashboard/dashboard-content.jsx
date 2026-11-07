import { dashboardStats } from "@/data/dashboard";
import Icon from "./icons";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import StatCard from "./stat-card";
import DonationChart from "./donation-chart";
import CampaignsPanel from "./campaigns-panel";
import DonationsTable from "./donations-table";
import ActivityPanel from "./activity-panel";

export default function DashboardContent() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8faf7] font-sans text-[#192d21]">
      <Sidebar />
      <section
        id="overview"
        className="ml-[252px] min-h-screen w-[calc(100%-252px)] max-[1180px]:ml-[220px] max-[1180px]:w-[calc(100%-220px)] max-[900px]:ml-[68px] max-[900px]:w-[calc(100%-68px)] max-[600px]:mb-[65px] max-[600px]:ml-0 max-[600px]:w-full"
      >
        <Topbar />
        <div className="mx-auto w-full max-w-[1500px] px-10 pb-[18px] pt-[30px] max-[1180px]:p-[26px] max-[600px]:px-[14px] max-[600px]:pb-[18px] max-[600px]:pt-[22px]">
          <div className="mb-[23px] flex items-end justify-between gap-3 max-[600px]:items-start max-[600px]:mb-[19px]">
            <div>
              <div className="mb-[9px] flex items-center gap-2 text-xs font-bold tracking-[.1em] text-[#657568] max-[600px]:text-[10px]">
                SATURDAY, NOVEMBER 7, 2026{" "}
                <span className="text-[13px] text-[#61bb46]">✳</span>
              </div>
              <h1 className="text-[clamp(24px,2.15vw,31px)] font-bold tracking-[-.8px] text-[#1c3323] max-[600px]:max-w-[280px] max-[600px]:text-[22px] max-[600px]:leading-tight">
                Super Admin{" "}
                <span className="align-[4px] text-xl text-[#e7ae48] max-[600px]:text-[15px]">
                  ✦
                </span>
              </h1>
              <p className="mt-[7px] text-sm text-[#657568] max-[600px]:max-w-[260px] max-[600px]:text-xs">
                Here’s what’s happening with your sadaqah today.
              </p>
            </div>
            <button className="flex h-10 items-center gap-2 rounded-lg border border-[#dae5d7] bg-white px-[13px] text-xs font-bold text-[#344d38] transition hover:-translate-y-px hover:border-[#a6c69c] hover:bg-[#f5faf2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[600px]:size-9 max-[600px]:shrink-0 max-[600px]:justify-center max-[600px]:overflow-hidden max-[600px]:p-0 max-[600px]:text-[0px]">
              <Icon
                name="download"
                size={16}
                className="max-[600px]:text-[#344d38]"
              />
              Export report
            </button>
          </div>
          <section
            aria-label="Key metrics"
            className="mb-[17px] grid grid-cols-4 gap-[15px] max-[1180px]:gap-2.5 max-[900px]:grid-cols-2 max-[600px]:mb-3 max-[600px]:gap-[9px]"
          >
            {dashboardStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>
          <section className="mb-4 grid grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] gap-4 max-[1180px]:grid-cols-[minmax(0,1.45fr)_minmax(275px,1fr)] max-[1180px]:gap-3 max-[900px]:grid-cols-1 max-[900px]:gap-3 max-[600px]:mb-[11px] max-[600px]:gap-[11px]">
            <DonationChart />
            <CampaignsPanel />
          </section>
          <section className="mb-4 grid grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] gap-4 max-[1180px]:grid-cols-[minmax(0,1.45fr)_minmax(275px,1fr)] max-[1180px]:gap-3 max-[900px]:grid-cols-1 max-[900px]:gap-3 max-[600px]:mb-[11px] max-[600px]:gap-[11px]">
            <DonationsTable />
            <ActivityPanel />
          </section>
          <footer className="flex justify-between px-0.5 text-[11px] text-[#718073] max-[600px]:flex-col max-[600px]:gap-1.5 max-[600px]:text-[10px]">
            <span>© 2026 Saylani Welfare International Trust</span>
            <span>
              Made with care for our community{" "}
              <b className="text-[#da8f77]">♥</b>
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import PartnerAvatar from "@/components/dashboard/partner-avatar";
import { formatPKR } from "@/lib/dashboard-data";
import { getPublicPartnerLeaderboard } from "@/lib/partner-leaderboard";

type PublicPartner = {
  rank: number;
  partnerName: string;
  installedBoxes: number;
  verifiedFunds: number;
};

export const metadata = {
  title: "Partner Leaderboard | Saylani Sadqa Manager",
  description:
    "See partner rankings by verified demo collections and installed Sadqa Boxes.",
};

const podiumStyles = [
  {
    border: "border-[#e8d293] bg-gradient-to-br from-[#fff8e4] to-white",
    badge: "bg-[#e8c45e] text-[#5b430c]",
    label: "#806214",
  },
  {
    border: "border-[#d9e0e2] bg-gradient-to-br from-[#f5f8f8] to-white",
    badge: "bg-[#c6d2d5] text-[#37484b]",
    label: "#596a6c",
  },
  {
    border: "border-[#e6c1a0] bg-gradient-to-br from-[#fff5ec] to-white",
    badge: "bg-[#d59b71] text-white",
    label: "#98613b",
  },
];

function PublicPartnerStats({ partner }: { partner: PublicPartner }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#758375]">
          Boxes installed
        </p>
        <p className="mt-1 text-xl font-bold text-[#203526]">
          {partner.installedBoxes.toLocaleString("en-PK")}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#758375]">
          Verified funds
        </p>
        <p className="mt-1 text-lg font-bold text-[#276431]">
          {formatPKR(partner.verifiedFunds)}
        </p>
      </div>
    </div>
  );
}

function PublicPartnerCard({ partner, index }: { partner: PublicPartner; index: number }) {
  const style = podiumStyles[index];

  return (
    <article
      className={`rounded-2xl border p-5 shadow-[0_5px_20px_rgba(34,61,37,.045)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(34,61,37,.10)] sm:p-6 ${index === 0 ? "lg:-translate-y-1 lg:hover:-translate-y-2" : ""} ${style.border}`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid size-9 place-items-center rounded-full text-sm font-extrabold ${style.badge}`}>
          {partner.rank}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-[.12em]"
          style={{ color: style.label }}
        >
          {index === 0 ? "Top partner" : `Rank ${partner.rank}`}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PartnerAvatar name={partner.partnerName} size={54} />
        <h2 className="text-base font-bold leading-snug text-[#203526] sm:text-lg">
          {partner.partnerName}
        </h2>
      </div>
      <PublicPartnerStats partner={partner} />
    </article>
  );
}

function PublicPartnerRow({ partner }: { partner: PublicPartner }) {
  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border border-[#e5ece2] bg-white p-3.5 transition hover:border-[#c8ddc3] hover:bg-[#fbfdf9] sm:grid-cols-[48px_minmax(220px,1fr)_150px_190px] sm:gap-4 sm:px-5">
      <span className="grid size-9 place-items-center rounded-full bg-[#f0f5ee] text-sm font-bold text-[#526552]">
        {partner.rank}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <PartnerAvatar name={partner.partnerName} size={42} />
        <p className="truncate text-sm font-bold text-[#26392b] sm:text-[15px]">
          {partner.partnerName}
        </p>
      </div>
      <p className="col-start-2 text-sm text-[#66766a] sm:col-start-auto">
        <span className="sm:hidden">Boxes: </span>
        <b className="font-bold text-[#344639]">
          {partner.installedBoxes.toLocaleString("en-PK")}
        </b>
        <span className="hidden sm:inline"> installed boxes</span>
      </p>
      <p className="col-start-2 text-sm font-bold text-[#276431] sm:col-start-auto sm:text-right">
        <span className="mr-1 font-medium text-[#718073] sm:hidden">
          Verified funds:
        </span>
        {formatPKR(partner.verifiedFunds)}
      </p>
    </article>
  );
}

export default function PublicLeaderboardPage() {
  const rankings: PublicPartner[] = getPublicPartnerLeaderboard();
  const topThree = rankings.slice(0, 3);
  const remainingPartners = rankings.slice(3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf5] text-[#192d21]">
      <header className="border-b border-[#e5ece2] bg-white">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#61bb46]"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#276431] font-serif text-xl text-white">
              س
            </span>
            <span className="text-xs font-extrabold tracking-[.08em] text-[#192d21] sm:text-sm">
              SAYLANI <span className="text-[#718073]">SADQA MANAGER</span>
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#536455] transition hover:bg-[#f2f8ef] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46]"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-9 sm:px-8 sm:pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#4f8a47]">
              Community partners
            </p>
            <h1 className="text-[clamp(30px,4vw,42px)] font-bold tracking-[-1px] text-[#192d21]">
              Partner Leaderboard
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#617265]">
              Recognizing partners by verified funds collected and Sadqa Boxes installed.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce8dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#4c6253]">
            <span className="size-2 rounded-full bg-[#61bb46]" />
            Fictional demo data
          </span>
        </div>

        <section
          aria-label="Top three partners"
          className="mb-7 grid gap-4 lg:grid-cols-3 lg:items-end lg:gap-5"
        >
          {topThree.map((partner, index) => (
            <PublicPartnerCard
              key={partner.rank}
              partner={partner}
              index={index}
            />
          ))}
        </section>

        {remainingPartners.length > 0 && (
          <section
            aria-label="Other partner rankings"
            className="overflow-hidden rounded-2xl border border-[#e5ece2] bg-[#f2f8ef]/70 p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between px-1 sm:px-2">
              <h2 className="text-sm font-bold text-[#344639]">More partners</h2>
              <span className="text-xs text-[#718073]">
                {remainingPartners.length} partners
              </span>
            </div>
            <div className="grid gap-2">
              {remainingPartners.map((partner) => (
                <PublicPartnerRow key={partner.rank} partner={partner} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#e5ece2] bg-white px-5 py-4 text-center text-xs text-[#718073]">
        Public partner ranking · Sample figures are fictional and for demonstration only.
      </footer>
    </div>
  );
}

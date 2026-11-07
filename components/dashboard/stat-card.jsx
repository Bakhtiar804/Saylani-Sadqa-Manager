import Icon from "./icons";

const tones = {
  green: "bg-[#e9f4e4] text-[#32723a]",
  blue: "bg-[#eaf1fc] text-[#326ac1]",
  orange: "bg-[#fbf0e3] text-[#cf8837]",
  purple: "bg-[#f1ecfa] text-[#8465bb]",
};

export default function StatCard({ label, value, change, note, icon, tone }) {
  return (
    <article className="min-w-0 rounded-[13px] border border-[#e6ece3] bg-white px-[18px] py-[17px] shadow-[0_2px_5px_rgba(31,55,34,.018)] transition duration-200 hover:-translate-y-1 hover:border-[#d2e3cc] hover:shadow-[0_10px_24px_rgba(31,55,34,.07)] max-[1180px]:px-[13px] max-[600px]:rounded-[11px] max-[600px]:px-[11px] max-[600px]:py-3">
      <div className="mb-3.5 flex items-center justify-between max-[600px]:mb-2.5">
        <span className={`grid size-[34px] place-items-center rounded-[10px] max-[600px]:size-[30px] ${tones[tone]}`}><Icon name={icon} size={19}/></span>
        <span className="text-[22px] leading-[14px] tracking-[1px] text-[#a4ada3]">···</span>
      </div>
      <p className="mb-2 text-[14px] font-semibold text-[#536455] max-[600px]:mb-1 max-[600px]:min-h-[34px] max-[600px]:text-xs">{label}</p>
      <div className="flex flex-wrap items-center gap-2 whitespace-nowrap max-[600px]:gap-1">
        <strong className="text-[clamp(21px,1.75vw,26px)] tracking-[-.6px] text-[#1e3324] max-[600px]:text-xl">{value}</strong>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#36743c] max-[600px]:text-[10px]"><Icon name="arrow" size={13}/>{change}</span>
      </div>
      <p className="mt-1.5 text-xs text-[#657568] max-[600px]:text-[10px]">{note}</p>
    </article>
  );
}

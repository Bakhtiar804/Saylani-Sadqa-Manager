import Icon from "./icons";

const tones = {
  green: "bg-[#e9f4e4] text-[#32723a]",
  blue: "bg-[#eaf1fc] text-[#326ac1]",
  orange: "bg-[#fbf0e3] text-[#a96d20]",
  purple: "bg-[#f1ecfa] text-[#7654ae]",
  red: "bg-[#fbeceb] text-[#a9483f]",
};

export function MetricCard({ label, value, note, icon = "chart", tone = "green" }) {
  return <article className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#cbdcc5] hover:shadow-[0_12px_28px_rgba(28,52,33,.08)]"><div className="mb-4 flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon name={icon} size={20}/></span><span className="h-1.5 w-12 rounded-full bg-[#f0f4ee]"/></div><p className="text-sm font-semibold text-[#657568]">{label}</p><p className="mt-1.5 text-[clamp(22px,2vw,30px)] font-bold tracking-[-.6px] text-[#1d3323]">{value}</p>{note && <p className="mt-2 text-xs text-[#718073]">{note}</p>}</article>;
}

export default function MetricGrid({ items, columns = 4 }) {
  const columnClass = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return <section className={`mb-6 grid grid-cols-1 gap-4 ${columnClass}`} aria-label="Summary metrics">{items.map((item) => <MetricCard key={item.label} {...item}/>)}</section>;
}

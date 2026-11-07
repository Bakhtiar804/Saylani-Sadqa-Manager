import Icon from "./icons";

const items = [
  ["grid", "Overview", "#overview"], ["wallet", "Donations", "#donations"],
  ["heart", "Campaigns", "#campaigns"], ["users", "Beneficiaries", "#activity"], ["chart", "Reports", "#overview"],
];

export default function Sidebar() {
  return <aside className="fixed z-20 flex h-screen w-[252px] flex-col border-r border-[#e8eee6] bg-white px-4 py-6 max-[900px]:w-[68px] max-[900px]:items-center max-[600px]:fixed max-[600px]:inset-x-0 max-[600px]:bottom-0 max-[600px]:top-auto max-[600px]:h-[65px] max-[600px]:w-full max-[600px]:flex-row max-[600px]:justify-center max-[600px]:border-r-0 max-[600px]:border-t max-[600px]:py-1">
    <a href="#overview" className="mb-9 flex items-center gap-2.5 px-2.5 max-[900px]:px-0 max-[600px]:hidden" aria-label="Saylani Sadqa Manager home"><span className="grid size-[38px] place-items-center rounded-xl bg-[#276431] font-serif text-[25px] text-white">س</span><span className="flex flex-col text-[13px] font-extrabold tracking-[.08em]">SAYLANI<small className="text-[8px] tracking-[.15em] text-[#718073]">SADQA MANAGER</small></span></a>
    <p className="mb-2.5 px-3 text-[10px] font-bold tracking-[.12em] text-[#9aa69a] max-[900px]:hidden">WORKSPACE</p>
    <nav aria-label="Main navigation" className="grid gap-1 max-[600px]:flex max-[600px]:w-full max-[600px]:max-w-[440px] max-[600px]:justify-around">
      {items.map(([icon, label, href], i) => <a key={label} href={href} aria-current={i === 0 ? "page" : undefined} className={`group relative flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition duration-200 hover:translate-x-0.5 hover:bg-[#f4f8f2] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] max-[900px]:justify-center max-[900px]:px-0 max-[600px]:min-w-[49px] max-[600px]:flex-col max-[600px]:gap-0.5 max-[600px]:px-1 max-[600px]:py-1 max-[600px]:text-[10px] ${i === 0 ? "bg-[#edf6e9] text-[#276431] before:absolute before:-left-4 before:h-[26px] before:w-[3px] before:rounded-r before:bg-[#61bb46] max-[900px]:before:-left-[9px] max-[600px]:before:-top-1 max-[600px]:before:left-1/2 max-[600px]:before:h-[3px] max-[600px]:before:w-[21px] max-[600px]:before:-translate-x-1/2" : "text-[#627165]"}`}><Icon name={icon} size={19}/><span className="max-[900px]:hidden max-[600px]:block">{label}</span></a>)}
    </nav>
    <div className="mt-auto max-[600px]:hidden">
      <div className="mb-4 rounded-[13px] border border-[#e3eddf] bg-gradient-to-br from-[#f4f9f0] to-[#fbfdf9] p-3.5 max-[900px]:hidden"><span className="mb-3 grid size-[26px] place-items-center rounded-lg bg-[#e4f2dc] text-[#276431]">✳</span><b className="text-xs text-[#203a27]">Need a hand?</b><p className="my-1.5 text-[11px] leading-relaxed text-[#758375]">Our support team is here for you.</p><a href="mailto:support@saylani.org" className="text-[11px] font-bold text-[#276431] hover:text-[#61bb46]">Contact support ›</a></div>
      <a href="#settings" className="flex min-h-[43px] items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold text-[#627165] transition hover:bg-[#f4f8f2] hover:text-[#276431] max-[900px]:justify-center max-[900px]:px-0"><Icon name="settings" size={19}/><span className="max-[900px]:hidden">Settings</span></a>
      <div className="mt-2 flex items-center gap-2.5 border-t border-[#edf1eb] px-1 pt-3.5 max-[900px]:justify-center"><span className="grid size-[34px] shrink-0 place-items-center rounded-full border-2 border-[#e4eedf] bg-[#dcebd5] text-[10px] font-extrabold text-[#276431]">SA</span><span className="flex flex-1 flex-col gap-1 max-[900px]:hidden"><b className="text-[11px] text-[#2a3c2e]">Super Admin</b><small className="text-[10px] text-[#89958a]">Administrator</small></span><Icon name="down" size={16} className="text-[#889589] max-[900px]:hidden"/></div>
    </div>
  </aside>;
}

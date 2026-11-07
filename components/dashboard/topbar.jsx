import Icon from "./icons";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-[66px] items-center justify-between border-b border-[#e9eee7] bg-white/95 px-10 backdrop-blur-xl max-[1180px]:px-6 max-[600px]:h-14 max-[600px]:px-4">
      <div className="flex items-center gap-2 text-xs text-[#91a092]">
        <span>Workspace</span>
        <Icon name="chevron" size={14} />
        <b className="text-[#344639]">Overview</b>
      </div>
      <div className="flex items-center gap-[18px] max-[600px]:gap-2">
        <button
          aria-label="Search"
          className="flex h-9 w-[245px] items-center gap-2 rounded-lg border border-[#e5ebe3] bg-[#fbfcfa] px-2.5 text-left text-[#849185] transition hover:border-[#b8d4ad] focus-visible:outline-2 focus-visible:outline-[#61bb46] max-[600px]:size-[34px] max-[600px]:justify-center max-[600px]:border-0 max-[600px]:bg-transparent"
        >
          <Icon name="search" size={18} />
          <span className="flex-1 text-[11px] max-[600px]:hidden">
            Search anything...
          </span>
          <kbd className="rounded border border-[#e5e9e3] bg-white px-1.5 py-0.5 text-[10px] max-[600px]:hidden">
            ⌘ K
          </kbd>
        </button>
        <button
          aria-label="Notifications"
          className="relative grid size-[34px] place-items-center rounded-lg text-[#647467] transition hover:bg-[#f2f7ef] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-[#61bb46]"
        >
          <Icon name="bell" size={19} />
          <i className="absolute right-[7px] top-[7px] size-1.5 rounded-full border border-white bg-[#e27955]" />
        </button>
        <span className="grid size-8 place-items-center rounded-full border-2 border-[#e4eedf] bg-[#dcebd5] text-[10px] font-extrabold text-[#276431] max-[600px]:size-[29px]">
          SA
        </span>
      </div>
    </header>
  );
}

import Icon from "./icons";

export default function DonationChart() {
  return (
    <article className="min-w-0 rounded-[13px] border border-[#e5ebe2] bg-white p-5 shadow-[0_2px_5px_rgba(31,55,34,.018)] max-[1180px]:p-[15px] max-[600px]:rounded-[11px] max-[600px]:p-[15px_13px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#25382a]">
            Donation overview
          </h2>
          <p className="mt-1 text-[13px] text-[#718073]">
            Track contributions over time
          </p>
        </div>
        <button className="flex h-[34px] items-center gap-1.5 rounded-md border border-[#e4eae1] px-2.5 text-xs text-[#46594a] transition hover:border-[#b8d4ad] hover:bg-[#f8fbf6] focus-visible:outline-2 focus-visible:outline-[#61bb46]">
          Last 7 days <Icon name="down" size={15} />
        </button>
      </div>
      <div className="mb-1 mt-5 flex items-baseline gap-2">
        <strong className="text-[22px] tracking-[-.5px] text-[#203526]">
          Rs 486,500
        </strong>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#36743c]">
          <Icon name="arrow" size={13} />
          18.6%
        </span>
        <small className="text-xs text-[#657568]">vs. previous week</small>
      </div>
      <div
        className="flex h-[153px] gap-[11px] max-[600px]:h-36"
        role="img"
        aria-label="Donation totals over the last seven days, trending upward"
      >
        <div className="flex w-[38px] flex-col justify-between pb-[23px] text-right text-[11px] text-[#657568]">
          <span>150k</span>
          <span>100k</span>
          <span>50k</span>
          <span>0</span>
        </div>
        <div className="relative flex flex-1 flex-col justify-end pb-[22px]">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-[#e8eee5]" />
          <div className="absolute inset-x-0 top-9 border-t border-dashed border-[#e8eee5]" />
          <div className="absolute inset-x-0 top-[72px] border-t border-dashed border-[#e8eee5]" />
          <svg
            className="absolute inset-0 h-[calc(100%-22px)] w-full overflow-visible"
            viewBox="0 0 700 185"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="donation-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#61bb46" stopOpacity=".2" />
                <stop offset="100%" stopColor="#61bb46" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 143 C35 143 53 125 88 128 S143 111 175 116 S232 90 263 99 S319 109 350 86 S408 90 438 69 S495 78 525 62 S583 70 613 42 S665 49 700 25 V185 H0Z"
              fill="url(#donation-fill)"
            />
            <path
              d="M0 143 C35 143 53 125 88 128 S143 111 175 116 S232 90 263 99 S319 109 350 86 S408 90 438 69 S495 78 525 62 S583 70 613 42 S665 49 700 25"
              fill="none"
              stroke="#3b8d36"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="700"
              cy="25"
              r="5"
              fill="white"
              stroke="#3b8d36"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-[#657568]">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#536455]">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-[7px] rounded-full bg-[#4c9a43]" />
          Donations received
        </span>
        <span className="text-[#a1aaa1]">Updated just now</span>
      </div>
    </article>
  );
}

import { activities } from "@/data/dashboard";
import Icon from "./icons";

const tones = {
  green: "bg-[#e8f3e4] text-[#35713a]",
  blue: "bg-[#eaf1fc] text-[#356ac0]",
  orange: "bg-[#fbefe1] text-[#c58236]",
};

export default function ActivityPanel() {
  return (
    <article
      id="activity"
      className="min-w-0 rounded-[13px] border border-[#e5ebe2] bg-white p-5 shadow-[0_2px_5px_rgba(31,55,34,.018)] max-[1180px]:p-[15px] max-[600px]:rounded-[11px] max-[600px]:p-[15px_13px]"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-[#25382a]">Recent activity</h2>
          <p className="mt-1 text-[13px] text-[#718073]">
            Latest updates from your workspace
          </p>
        </div>
        <button
          aria-label="More activity options"
          className="grid size-7 place-items-center rounded-md text-xl text-[#879488] transition hover:bg-[#f3f7f1] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-[#61bb46]"
        >
          ···
        </button>
      </div>
      <div className="mt-3 grid">
        {activities.map((item) => (
          <div
            key={item.title}
            className="flex gap-2.5 border-b border-[#f0f3ee] py-3 last:border-0"
          >
            <span
              className={`grid size-[29px] shrink-0 place-items-center rounded-[9px] ${tones[item.tone]}`}
            >
              <Icon name={item.icon} size={16} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <b className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-[#35473a]">
                {item.title}
              </b>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#657568]">
                {item.detail}
              </span>
              <small className="inline-flex items-center gap-1 text-xs text-[#657568]">
                <Icon name="clock" size={12} />
                {item.time}
              </small>
            </div>
          </div>
        ))}
      </div>
      <a
        href="#activity"
        className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-bold text-[#276431] hover:text-[#408d39] focus-visible:outline-2 focus-visible:outline-[#61bb46]"
      >
        View all activity <Icon name="chevron" size={15} />
      </a>
    </article>
  );
}

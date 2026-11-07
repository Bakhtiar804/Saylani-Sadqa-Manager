import { campaigns } from "@/data/dashboard";
import Icon from "./icons";

export default function CampaignsPanel() {
  return (
    <article
      id="campaigns"
      className="min-w-0 rounded-[13px] border border-[#e5ebe2] bg-white p-5 shadow-[0_2px_5px_rgba(31,55,34,.018)] max-[1180px]:p-[15px] max-[600px]:rounded-[11px] max-[600px]:p-[15px_13px]"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-[#25382a]">Top campaigns</h2>
          <p className="mt-1 text-[13px] text-[#718073]">
            By funds raised this month
          </p>
        </div>
        <button
          aria-label="More campaign options"
          className="grid size-7 place-items-center rounded-md text-xl text-[#879488] transition hover:bg-[#f3f7f1] hover:text-[#276431] focus-visible:outline-2 focus-visible:outline-[#61bb46]"
        >
          ···
        </button>
      </div>
      <div className="mt-[18px] grid gap-[17px]">
        {campaigns.map((campaign) => (
          <div key={campaign.name}>
            <div className="flex items-center gap-2">
              <span
                className="grid size-[29px] shrink-0 place-items-center rounded-[9px] bg-[#f5f8f3]"
                style={{ color: campaign.color }}
              >
                <Icon name={campaign.icon} size={17} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <b className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#35473a]">
                  {campaign.name}
                </b>
                <small className="text-xs text-[#657568]">
                  {campaign.category}
                </small>
              </span>
              <span className="text-xs font-bold text-[#536455]">
                {campaign.percent}%
              </span>
            </div>
            <div className="mb-1.5 ml-[37px] mt-[9px] h-[5px] overflow-hidden rounded-full bg-[#edf1eb]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${campaign.percent}%`,
                  backgroundColor: campaign.color,
                }}
              />
            </div>
            <div className="ml-[37px] flex justify-between text-xs text-[#657568]">
              <b className="text-xs text-[#34473a]">{campaign.raised}</b>
              <span>of {campaign.goal}</span>
            </div>
          </div>
        ))}
      </div>
      <a
        href="#campaigns"
        className="mt-4 inline-flex items-center gap-0.5 text-[13px] font-bold text-[#276431] hover:text-[#408d39] focus-visible:outline-2 focus-visible:outline-[#61bb46]"
      >
        View all campaigns <Icon name="chevron" size={15} />
      </a>
    </article>
  );
}

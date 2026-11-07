import { donations } from "@/data/dashboard";
import Icon from "./icons";

const avatarTones = {
  green: "bg-[#e8f3e4] text-[#35713a]",
  blue: "bg-[#eaf1fc] text-[#356ac0]",
  orange: "bg-[#fbefe1] text-[#c58236]",
  purple: "bg-[#f1ebf9] text-[#7b62ae]",
};

export default function DonationsTable() {
  return (
    <article id="donations" className="min-w-0 rounded-[13px] border border-[#e5ebe2] bg-white p-5 shadow-[0_2px_5px_rgba(31,55,34,.018)] max-[1180px]:p-[15px] max-[600px]:rounded-[11px] max-[600px]:p-[15px_13px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#25382a]">Recent donations</h2>
          <p className="mt-1 text-[13px] text-[#718073]">Your latest contributions across all campaigns</p>
        </div>
        <a href="#donations" className="inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] font-bold text-[#276431] hover:text-[#408d39] focus-visible:outline-2 focus-visible:outline-[#61bb46] max-[600px]:hidden">View all <Icon name="chevron" size={15}/></a>
      </div>
      <div className="mt-[17px] w-full overflow-x-auto max-[600px]:mt-[13px]">
        <table className="w-full border-collapse text-left max-[600px]:min-w-[650px]">
          <thead><tr className="border-b border-[#edf1eb] text-[11px] font-bold tracking-[.07em] text-[#657568]"><th className="pb-2.5 pl-0 pr-2.5">DONOR</th><th className="px-2.5 pb-2.5">CAMPAIGN</th><th className="px-2.5 pb-2.5">AMOUNT</th><th className="px-2.5 pb-2.5">DATE</th><th className="px-2.5 pb-2.5">STATUS</th></tr></thead>
          <tbody>
            {donations.map((donation) => (
              <tr key={donation.email} className="border-b border-[#f1f4ef] text-xs text-[#536455] transition last:border-0 hover:bg-[#fbfdf9]">
                <td className="py-[11px] pl-0 pr-2.5"><div className="flex items-center gap-2"><span className={`grid size-[34px] shrink-0 place-items-center rounded-full text-[10px] font-bold ${avatarTones[donation.tone]}`}>{donation.initials}</span><span className="flex flex-col gap-[3px]"><b className="text-xs text-[#34473a]">{donation.name}</b><small className="text-[11px] text-[#657568]">{donation.email}</small></span></div></td>
                <td className="max-w-[135px] overflow-hidden text-ellipsis whitespace-nowrap px-2.5">{donation.campaign}</td>
                <td className="whitespace-nowrap px-2.5 font-bold text-[#354b39]">{donation.amount}</td>
                <td className="whitespace-nowrap px-2.5 text-[#68796b]">{donation.date}</td>
                <td className="px-2.5"><span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold ${donation.status === "Completed" ? "bg-[#edf6e9] text-[#36743c]" : "bg-[#fff5e8] text-[#a96d20]"}`}><i className="size-[6px] rounded-full bg-current"/>{donation.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <a href="#donations" className="mt-2 hidden items-center gap-1 text-[13px] font-bold text-[#276431] hover:text-[#408d39] max-[600px]:inline-flex">View all donations <Icon name="chevron" size={15}/></a>
    </article>
  );
}

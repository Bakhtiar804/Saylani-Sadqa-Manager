import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getOperationsSession } from '@/lib/operations-auth';
import { getRiderDetails } from '@/lib/rider-details';
import { canOperate } from '@/lib/permissions';
import { formatPKR } from '@/lib/dashboard-data';
import PageHeading from './page-heading';
import MetricGrid from './metric-grid';
import RiderAssignmentForm from './rider-assignment-form';
import RecordExplorer from './record-explorer';
import ChartPanel from './chart-panel';
import { BreakdownBarChart } from './charts';

export default async function RiderDetailsPage({searchParams}:{searchParams:Promise<{month?:string}>}) {
  await connection();const session=await getOperationsSession();if(!session) redirect('/sign-in');
  const params=await searchParams;const data=await getRiderDetails(session,typeof params.month==='string'?params.month:undefined);
  const amount=data.history.reduce((sum,row)=>sum+Number(row.amount_pkr||0),0);
  const chart=data.profiles.map(rider=>({name:String(rider.rider_name),value:data.history.filter(row=>row.rider_id===rider.rider_id).reduce((sum,row)=>sum+Number(row.amount_pkr||0),0)}));
  return <><PageHeading eyebrow="Field team" title={session.role==='rider'?'My Rider Profile':'Rider Details'} description="Contact details, assignments and monthly collection history by area and box."/>
    <form className="mb-6 flex flex-wrap items-end gap-3"><label className="grid gap-2 text-xs font-semibold text-[#536455]">Collection month<input type="month" name="month" defaultValue={data.month} className="rounded-xl border border-[#dce8dc] bg-white px-4 py-3 text-sm"/></label><button className="rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white">View month</button><span className="pb-3 text-xs text-[#718073]">Defaults to the previous calendar month</span></form>
    {canOperate(session.role) && <RiderAssignmentForm riders={data.profiles} boxes={data.boxes}/>}
    <MetricGrid items={[
      {label:'Riders',value:data.profiles.length,note:'Within your access scope',icon:'bike',tone:'blue'},
      {label:'Month collection',value:formatPKR(amount),note:data.month,icon:'cash',tone:'green'},
      {label:'Collection records',value:data.history.length,note:'Individual records only',icon:'wallet',tone:'purple'},
      {label:'Boxes visited',value:new Set(data.history.map(row=>row.box_id)).size,note:'During the selected month',icon:'box',tone:'orange'},
    ]}/>
    {data.profiles.length>0 && <div className="mb-6"><ChartPanel title="Rider collections this month"><BreakdownBarChart data={chart} valueFormat="currency" horizontal height={Math.max(220,Math.min(650,chart.length*44))}/></ChartPanel></div>}
    <div className="grid gap-5">{data.profiles.map(rider=>{
      const records=data.history.filter(row=>row.rider_id===rider.rider_id);const tasks=data.tasks.filter(row=>row.rider_id===rider.rider_id);const areas=[...new Set(records.map(row=>String(row.area || 'Area not supplied')))];
      return <details key={String(rider.rider_id)} className="rounded-2xl border border-[#e3ebe0] bg-white" open={data.profiles.length===1}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5"><span className="grid size-12 place-items-center rounded-full bg-[#e8f2e2] font-bold text-[#276431]">{String(rider.rider_name).split(' ').slice(0,2).map(name=>name[0]).join('')}</span><div className="flex-1"><h2 className="font-bold text-[#203526]">{String(rider.rider_name)}</h2><p className="mt-1 text-xs text-[#718073]">{String(rider.city_name || 'City not supplied')} · {String(rider.assigned_zone)}</p></div><div className="text-right"><b className="block text-lg text-[#276431]">{formatPKR(records.reduce((sum,row)=>sum+Number(row.amount_pkr||0),0))}</b><small className="text-[#718073]">{records.length} collections · {data.month}</small></div><span aria-hidden="true">⌄</span></summary>
        <div className="border-t border-[#edf1eb] p-5"><dl className="mb-5 grid gap-4 rounded-xl bg-[#f7faf5] p-4 sm:grid-cols-2 xl:grid-cols-4">{[['Rider ID',rider.rider_id],['Email',rider.email],['Phone',rider.phone || 'Not supplied'],['Employment',rider.employment_status],['Login status',rider.account_status],['Assigned boxes',data.boxes.filter(box=>box.assigned_rider_id===rider.rider_id).length],['Open tasks',tasks.filter(task=>['Assigned','In Progress'].includes(String(task.task_status))).length],['Completed tasks',tasks.filter(task=>task.task_status==='Completed').length]].map(([label,value])=><div key={String(label)}><dt className="text-xs text-[#718073]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#344639]">{String(value)}</dd></div>)}</dl>
        <div className="mb-5 border-l-2 border-[#dce8dc] pl-4"><h3 className="mb-3 text-sm font-bold text-[#203526]">{data.month} → Areas → Boxes</h3>{areas.map(area=><details key={area} className="my-3 rounded-xl bg-[#f8fbf6] p-3"><summary className="cursor-pointer text-sm font-semibold">{area} <span className="ml-3 text-[#276431]">{formatPKR(records.filter(row=>(row.area || 'Area not supplied')===area).reduce((sum,row)=>sum+Number(row.amount_pkr||0),0))}</span></summary><ul className="mt-3 grid gap-2 border-l border-[#dce8dc] pl-3">{records.filter(row=>(row.area || 'Area not supplied')===area).map(row=><li key={String(row.collection_id)} className="flex flex-wrap justify-between gap-2 text-xs"><span>{String(row.box_id)} · {String(row.collection_date)}</span><b>{formatPKR(Number(row.amount_pkr))}</b></li>)}</ul></details>)}{!records.length && <p className="py-4 text-sm text-[#718073]">No individual collections recorded for this rider in {data.month}. City-level Excel totals cannot be attributed to a rider.</p>}</div>
        <RecordExplorer title={`${String(rider.rider_name)} · Collection history`} description="Recorded date, location, amount and cash handover details." records={records} columns={[{key:'collection_id',label:'Collection'},{key:'collection_date',label:'Date'},{key:'box_id',label:'Box'},{key:'area',label:'Area'},{key:'amount_pkr',label:'Amount'}]} cityKey="" dateKey="collection_date"/>
        </div>
      </details>;
    })}</div>
    {!data.profiles.length && <section className="rounded-2xl border border-[#e3ebe0] bg-white p-8 text-center text-sm text-[#718073]">No rider profiles are available in your scope.</section>}
  </>;
}

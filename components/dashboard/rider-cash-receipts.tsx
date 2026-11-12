import type { DataRecord } from '@/lib/dashboard-types';
import { CASH_DENOMINATIONS } from '@/lib/rider-workflow';

export default function RiderCashReceipts({ collections }: { collections: DataRecord[] }) {
  const counted = collections.filter(collection => collection.cash_breakdown);
  if (!counted.length) return null;
  return <section className="mb-6 rounded-2xl border border-[#e3ebe0] bg-white p-5"><h2 className="mb-4 text-lg font-bold text-[#203526]">Cash count receipts</h2><div className="grid gap-3">{counted.slice(0, 10).map(collection => {
    const counts = JSON.parse(String(collection.cash_breakdown)) as Record<string, number>;
    return <details key={String(collection.collection_id)} className="rounded-xl border border-[#e3ebe0] p-4"><summary className="flex cursor-pointer flex-wrap justify-between gap-3 text-sm"><span className="font-semibold">{String(collection.box_id)} · {String(collection.collection_date).slice(0, 10)}</span><b className="text-[#276431]">PKR {Number(collection.collection_amount_pkr).toLocaleString('en-PK')}</b></summary><p className="my-3 text-xs text-[#718073]">{String(collection.collection_id)} · {String(collection.rider_task_id)}</p><dl className="grid gap-2 sm:grid-cols-2">{CASH_DENOMINATIONS.filter(item => counts[item.key] > 0).map(item => <div key={item.key} className="flex justify-between gap-3 rounded-lg bg-[#f7faf5] p-3 text-xs"><dt>Rs {item.value.toLocaleString('en-PK')} {item.kind} × {counts[item.key]}</dt><dd className="font-bold">PKR {(counts[item.key] * item.value).toLocaleString('en-PK')}</dd></div>)}</dl></details>;
  })}</div></section>;
}

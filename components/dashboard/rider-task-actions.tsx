"use client";

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { fetchResponse } from '@/lib/client-request';
import type { DataRecord } from '@/lib/dashboard-types';
import { CASH_DENOMINATIONS, COLLECTION_STEPS, countCash, getCollectionStage, type CashCounts, type CashKey } from '@/lib/rider-workflow';

const money = (value: number) => `PKR ${value.toLocaleString('en-PK')}`;
const button = 'rounded-xl bg-[#276431] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'rounded-xl border border-[#dce8dc] px-4 py-3 text-sm font-semibold disabled:opacity-50';

export default function RiderTaskActions({ tasks, canWork = true }: { tasks: DataRecord[]; canWork?: boolean }) {
  return <section className="grid gap-5" aria-label="Assigned rider tasks">
    {!canWork && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Your rider profile is inactive. Contact your city team to resume work.</p>}
    {!tasks.length && <div className="rounded-2xl border border-[#e3ebe0] bg-white p-8 text-center"><h2 className="font-bold">No tasks assigned</h2><p className="mt-2 text-sm text-[#718073]">New assignments will appear here.</p></div>}
    {tasks.map(task => <RiderTaskCard key={String(task.task_id)} task={task} canWork={canWork}/>)}
  </section>;
}

function RiderTaskCard({ task, canWork }: { task: DataRecord; canWork: boolean }) {
  const router = useRouter();
  const taskId = String(task.task_id);
  const source=JSON.stringify([task.task_status,task.workflow_stage,task.workflow_events]);
  const [savedState,setSavedState]=useState<{source:string;status:string;stage:string}|null>(null);
  const saved=savedState?.source===source?savedState:null;
  const status = saved?.status ?? String(task.task_status);
  const stage = getCollectionStage(status,saved?.stage ?? task.workflow_stage);
  const isCollection = task.task_type === 'Scheduled Collection';
  const closed = ['Completed', 'Cancelled'].includes(status);
  const skipped = status === 'Skipped';
  const [counts, setCounts] = useState<Partial<Record<CashKey, string>>>({});
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [receipt, setReceipt] = useState<{collectionId: string; amount: number} | null>(null);
  const inFlight = useRef(false);
  const [locallyClosed, setLocallyClosed] = useState(false);
  const numericCounts: CashCounts = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value || 0)]));
  let cash = { total: 0, coins: 0, notes: 0 };
  let cashError = '';
  try { cash = countCash(numericCounts); } catch (error) { cashError = error instanceof Error ? error.message : 'Invalid counts.'; }
  const stepIndex = COLLECTION_STEPS.findIndex(step => step.key === stage);
  let events: { stage?: string; status?: string; at?: string }[] = [];
  try { events = JSON.parse(String(task.workflow_events || '[]')); } catch { /* Historical records may not have a timeline. */ }

  async function performRequest(body: object, operation: 'progress' | 'collection') {
    const submit=operation==='collection';
    if (inFlight.current || !canWork) return;
    inFlight.current = true; setBusy(true); setMessage({});
    try {
      const response = await fetchResponse(`/api/dashboard/tasks/${encodeURIComponent(taskId)}${submit ? '/collection' : ''}`, {
        method: submit ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, notes }),
      });
      const result = await response.json() as { error?: string; collectionId?: string; amount?: number; status?:string; stage?:string };
      if(response.ok && !submit && 'stage' in body && (result.status!=='In Progress' || result.stage!==body.stage)) {
        router.refresh();
        throw new Error('The server returned an unexpected task update. Your progress is being refreshed; no collection was confirmed.');
      }
      if(result.status && result.stage && (response.ok || response.status===409)) {
        setSavedState({source,status:result.status,stage:result.stage});
      }
      if(response.status===409) router.refresh();
      if (!response.ok) throw new Error(result.error || 'Could not save this update. Please try again.');
      if (submit) {
        if (!result.collectionId || typeof result.amount !== 'number' || !Number.isFinite(result.amount)) throw new Error('The server returned an incomplete collection receipt. Refresh to check your collection history.');
        setReceipt({ collectionId: result.collectionId, amount: result.amount });
        setLocallyClosed(true);
        setCounts({}); setConfirmed(false);
      } else if ('status' in body && body.status === 'Completed') setLocallyClosed(true);
      setMessage({ success: submit ? 'Collection saved. Cash handover is pending.' : 'Task progress saved.' });
      router.refresh();
    } catch (error) { setMessage({ error: error instanceof Error ? error.message : 'Could not save. Please try again.' }); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function updateTask(body:object) { return performRequest(body,'progress'); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cashError || !confirmed || cash.total <= 0) return;
    void performRequest({ counts: numericCounts }, 'collection');
  }
  const date = new Date(`${String(task.task_date).slice(0, 10)}T00:00:00Z`);
  return <article id={`task-${taskId}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#dce8dc] bg-white shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3 p-5">
      <div><p className="text-xs font-semibold text-[#718073]">{taskId} · {Number.isNaN(date.getTime()) ? String(task.task_date) : date.toLocaleDateString('en-PK', { dateStyle: 'medium', timeZone: 'UTC' })}</p><h2 className="mt-1 text-lg font-bold text-[#203526]">{String(task.task_type)} · {String(task.box_id)}</h2><p className="mt-1 text-sm text-[#536455]">{String(task.area || 'Area not specified')}{task.location_description ? ` · ${task.location_description}` : ''}</p></div>
      <span className="rounded-full bg-[#edf5e8] px-3 py-1 text-xs font-bold text-[#276431]">{locallyClosed ? 'Completed' : skipped || closed ? status : isCollection ? COLLECTION_STEPS[stepIndex]?.label || status : status}</span>
    </header>
    {isCollection && <ol aria-label="Collection progress" className="grid grid-cols-5 border-y border-[#e3ebe0] bg-[#f7faf5] px-2 py-4 sm:px-5">{COLLECTION_STEPS.map((step, index) => <li key={step.key} aria-current={!skipped && index === stepIndex ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">{index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= stepIndex || receipt ? 'bg-[#61bb46]' : 'bg-[#dce8dc]'}`}/>}<span className={`relative z-10 grid size-8 place-items-center rounded-full text-xs font-bold ${index <= stepIndex || receipt ? 'bg-[#276431] text-white' : 'bg-[#e4ebdf] text-[#718073]'}`}>{index < stepIndex || receipt ? '✓' : index + 1}</span><span className="text-[10px] font-semibold text-[#536455] sm:text-xs">{step.label}</span></li>)}</ol>}
    <div className="p-5">
      {message.error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{message.error}</p>}
      {message.success && <p role="status" className="mb-4 rounded-xl bg-[#edf6e9] p-3 text-sm text-[#276431]">{message.success}</p>}
      {receipt && <div className="mb-4 rounded-xl bg-[#f3f8ef] p-4"><p className="text-xs text-[#718073]">{receipt.collectionId}</p><b className="text-2xl text-[#276431]">{money(receipt.amount)}</b><p className="mt-1 text-xs text-[#718073]">Submitted · Awaiting cash handover</p></div>}
      {!closed && !locallyClosed && canWork && <>
        <label className="mb-4 grid gap-2 text-xs font-semibold text-[#536455]">Visit note / reason for skipping<input maxLength={500} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} placeholder="Location issue, shop closed, or visit note" className="rounded-xl border border-[#dce8dc] px-3 py-3 text-sm font-normal"/></label>
        {skipped ? <button type="button" className={button} disabled={busy} onClick={() => updateTask({ status: 'In Progress' })}>Resume task</button> : !isCollection ? <div className="flex flex-wrap gap-3">{status !== 'In Progress' && <button type="button" className={secondary} disabled={busy} onClick={() => updateTask({ status: 'In Progress' })}>Start visit</button>}<button type="button" className={button} disabled={busy} onClick={() => updateTask({ status: 'Completed' })}>Complete visit</button></div> : task.box_status !== 'Active' ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This box is {String(task.box_status).toLowerCase()}. Contact your city team before collecting.</p> : <>
          {stage === 'assigned' && <button type="button" className={button} disabled={busy} onClick={() => updateTask({ stage: 'departed' })}>I am leaving for collection →</button>}
          {stage === 'departed' && <div><p className="mb-3 text-sm text-[#536455]">You are on the way to this box.</p><button type="button" className={button} disabled={busy} onClick={() => updateTask({ stage: 'arrived' })}>I have arrived at the location →</button></div>}
          {stage === 'arrived' && <button type="button" className={button} disabled={busy} onClick={() => updateTask({ stage: 'counting' })}>Start counting cash →</button>}
          {stage === 'counting' && <form onSubmit={submit}>
            {(['coin', 'note'] as const).map(kind => <fieldset key={kind} disabled={busy} className="mb-5"><legend className="mb-3 text-sm font-bold text-[#203526]">{kind === 'coin' ? 'Coins' : 'Notes'} · enter quantity</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{CASH_DENOMINATIONS.filter(item => item.kind === kind).map(item => <label key={item.key} className="grid gap-2 rounded-xl border border-[#e3ebe0] bg-[#fafcf8] p-3"><span className="flex items-center gap-2 text-sm font-bold text-[#276431]"><span aria-hidden="true" className={kind === 'coin' ? 'grid size-8 place-items-center rounded-full border-2 border-[#b6cb91] bg-[#eef2da] text-[9px]' : 'grid h-7 w-11 place-items-center rounded border-2 border-[#9cbd98] bg-[#e8f1df] text-[9px]'}>{item.value}</span>Rs {item.value.toLocaleString('en-PK')}</span><input aria-label={`Rs ${item.value} ${kind} quantity`} type="number" inputMode="numeric" min="0" max="100000000" step="1" placeholder="0" value={counts[item.key] ?? ''} onChange={event => {setCounts(current => ({ ...current, [item.key]: event.target.value })); setConfirmed(false);}} className="w-full rounded-lg border border-[#dce8dc] bg-white px-3 py-2 text-base"/><span className="text-xs text-[#718073]">{money(Number(counts[item.key] || 0) * item.value)}</span></label>)}</div></fieldset>)}
            <div className="rounded-xl bg-[#276431] p-4 text-white"><div className="flex flex-wrap justify-between gap-4"><span className="text-sm">Calculated total</span><output aria-live="polite" className="text-2xl font-bold">{cashError ? '—' : money(cash.total)}</output></div><p className="mt-2 text-xs text-white/80">Coins {money(cash.coins)} · Notes {money(cash.notes)}</p></div>
            {cashError && <p role="alert" className="mt-3 text-sm text-red-800">{cashError}</p>}
            <label className="my-4 flex items-start gap-3 text-sm text-[#536455]"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-[#276431]"/>I have checked the coin and note quantities and confirm this cash count.</label>
            <button type="submit" className={button} disabled={busy || !confirmed || !!cashError || cash.total <= 0}>{busy ? 'Saving collection…' : 'Confirm & submit collection'}</button>
          </form>}
        </>}
        {!skipped && <button type="button" className="mt-4 block text-sm font-semibold text-[#718073] disabled:opacity-40" disabled={busy || !notes.trim()} onClick={() => updateTask({ status: 'Skipped' })}>Skip task (reason required)</button>}
      </>}
      {events.length > 0 && <details className="mt-4 border-t border-[#e3ebe0] pt-3"><summary className="cursor-pointer text-xs font-semibold text-[#718073]">Visit timeline</summary><ol className="mt-3 grid gap-2 border-l-2 border-[#dce8dc] pl-3">{events.map((event, index) => <li key={index} className="flex flex-wrap justify-between gap-2 text-xs text-[#536455]"><b>{event.status === 'Skipped' ? 'Skipped' : COLLECTION_STEPS.find(step => step.key === event.stage)?.label || event.status}</b><time>{event.at ? new Date(event.at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : ''}</time></li>)}</ol></details>}
    </div>
  </article>;
}

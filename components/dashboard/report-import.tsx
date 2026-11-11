'use client';
import { useState,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '@/lib/client-request';
import type { UploadPreview } from '@/lib/report-upload';

export default function ReportImport({city}: {city:string}) {
  const router=useRouter();const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState<UploadPreview|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>,mode:'preview'|'apply') {
    event.preventDefault();if(!file || busy) return;setBusy(true);setError('');setSuccess('');
    const form=new FormData();form.set('file',file);form.set('mode',mode);if(preview) form.set('fingerprint',preview.fingerprint);
    try {
      const result=await requestJson<{preview:UploadPreview;alreadyImported?:boolean}>('/api/reports/import',{method:'POST',body:form});
      setPreview(result.preview);
      if(mode==='apply') {setSuccess(result.alreadyImported?'This workbook was already imported. No duplicates were added.':'Import complete. Your city reports have been updated.');setPreview(null);router.refresh();}
    } catch(failure) {setError(failure instanceof Error?failure.message:'The import could not be completed.');}
    finally {setBusy(false);}
  }
  return <section className="rounded-2xl border border-[#e3ebe0] bg-white p-6">
    <div className="mb-6 flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-[#edf6e9] text-2xl text-[#276431]">↑</span><div><h2 className="text-xl font-bold text-[#203526]">Import reports for {city}</h2><p className="mt-1 text-sm text-[#657568]">Choose Excel → Preview → Import</p></div></div>
    <form onSubmit={event=>submit(event,'preview')} className="grid gap-4">
      <label className="grid gap-3 rounded-2xl border-2 border-dashed border-[#cbdcc5] bg-[#f8fbf6] p-6 text-sm font-semibold text-[#344639]">Monthly report workbook<input type="file" accept=".xlsx" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]??null);setPreview(null);setError('');setSuccess('');}} className="text-sm font-normal"/><span className="text-xs font-normal text-[#718073]">Public_Collection, Branch_Collection, Public_Expense, Public_Staff · Max 5 MB</span></label>
      <button disabled={!file || busy} className="w-fit rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?'Processing…':'Preview workbook'}</button>
    </form>
    {preview && <form onSubmit={event=>submit(event,'apply')} className="mt-6 rounded-2xl border border-[#dce8dc] bg-[#f8fbf6] p-5"><h3 className="font-bold text-[#203526]">{preview.city} · {preview.firstMonth.slice(0,7)} – {preview.lastMonth.slice(0,7)}</h3><dl className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Collections',preview.collections],['Expenses',preview.expenses],['Staff rows',preview.staff],['Unreported amounts',preview.missing]].map(([label,value])=><div key={label} className="rounded-xl bg-white p-4"><dt className="text-xs text-[#718073]">{label}</dt><dd className="mt-1 text-2xl font-bold text-[#276431]">{value}</dd></div>)}</dl><p className="mb-4 text-sm text-[#657568]">Only {preview.city} will be updated. {preview.excluded} other-city rows will be excluded. Existing city/month records are updated; blank amounts stay unreported.</p><button disabled={busy} className="rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?'Importing…':'Import city records'}</button></form>}
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="mt-5 rounded-xl bg-[#edf6e9] p-4 text-sm text-[#276431]">{success}</p>}
  </section>;
}

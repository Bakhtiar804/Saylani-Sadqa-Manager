'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {requestJson} from '@/lib/client-request';
export default function BoxDistrictControl({boxId,currentDistrict}:{boxId:string;currentDistrict:string}) {
 const router=useRouter();const [district,setDistrict]=useState(currentDistrict);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setMessage('');setError('');try{await requestJson(`/api/dashboard/boxes/${encodeURIComponent(boxId)}/district`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({district})});setMessage('District saved. Rankings updated.');router.refresh();}catch(error){setError(error instanceof Error?error.message:'Could not save district.');}finally{setBusy(false);}}
 return <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#dce8dc] bg-white p-4"><label className="grid flex-1 gap-1.5 text-xs font-semibold text-[#536455]">District<input required minLength={2} maxLength={100} value={district} onChange={event=>setDistrict(event.target.value)} disabled={busy} placeholder="e.g. Karachi East" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm"/></label><button disabled={busy} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white">{busy?'Saving…':'Save district'}</button>{message&&<p role="status" className="w-full text-xs text-[#276431]">{message}</p>}{error&&<p role="alert" className="w-full text-xs text-[#913a34]">{error}</p>}</form>;
}

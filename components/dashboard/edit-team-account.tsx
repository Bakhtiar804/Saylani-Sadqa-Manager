'use client';
import {useState,type FormEvent} from 'react';
import type {TeamAccount} from '@/lib/admin-accounts';
import {fetchResponse} from '@/lib/client-request';

export default function EditTeamAccount({account,onClose,onSaved}:{account:TeamAccount;onClose:()=>void;onSaved:(account:TeamAccount)=>void}) {
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const field='h-11 w-full rounded-xl border border-[#dce8dc] bg-white px-3 text-sm font-normal focus:border-[#276431] focus:outline-none focus:ring-2 focus:ring-[#61bb46]/20';
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving)return;
  const values=new FormData(event.currentTarget);setSaving(true);setError('');
  try{
   const response=await fetchResponse('/api/team-accounts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:account.id,...Object.fromEntries(values)})});
   const result=await response.json();if(!response.ok||!result.account)throw new Error(result.error||'Could not save account changes.');
   onSaved(result.account);
  }catch(error){setError(error instanceof Error?error.message:'Could not save account changes.');}finally{setSaving(false);}
 }
 return <div className="fixed inset-0 z-50 grid place-items-center bg-[#142019]/55 p-4" onKeyDown={event=>{if(event.key==='Escape'&&!saving)onClose();}}><section role="dialog" aria-modal="true" aria-labelledby="edit-team-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 id="edit-team-title" className="text-xl font-bold text-[#203526]">Edit team account</h2><p className="mt-1 text-sm text-[#718073]">{account.role} · {account.cityName||'No assigned city'}</p><form onSubmit={save} className="mt-5 grid gap-4"><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Full name<input autoFocus name="name" defaultValue={account.name} minLength={2} maxLength={120} required className={field}/></label><label className="grid gap-1.5 text-sm font-semibold">Email<input name="email" type="email" defaultValue={account.email} maxLength={254} required className={field}/></label><label className="grid gap-1.5 text-sm font-semibold">Phone<input name="phone" type="tel" defaultValue={account.phone||''} minLength={7} maxLength={32} required className={field}/></label><label className="grid gap-1.5 text-sm font-semibold">Login status<select name="accountStatus" defaultValue={account.accountStatus} className={field}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>{account.role==='Rider'&&<><label className="grid gap-1.5 text-sm font-semibold">Employment status<select name="employmentStatus" defaultValue={account.employmentStatus||'Active'} className={field}><option>Active</option><option>Inactive</option></select></label><label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Assigned zone<input name="assignedZone" defaultValue={account.zone||''} maxLength={80} required className={field}/></label></>}</fieldset>{error&&<p role="alert" className="rounded-xl bg-[#fbeceb] p-3 text-sm text-[#913a34]">{error}</p>}<div className="mt-2 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancel</button><button disabled={saving} className="rounded-xl bg-[#276431] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?'Saving…':'Save changes'}</button></div></form></section></div>;
}

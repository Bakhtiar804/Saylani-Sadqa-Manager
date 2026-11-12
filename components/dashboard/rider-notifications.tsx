'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { requestJson } from '@/lib/client-request';
import type { RiderTaskNotificationFeed } from '@/lib/rider-notification-types';

export default function RiderNotifications() {
  const [open,setOpen]=useState(false);
  const [feed,setFeed]=useState<RiderTaskNotificationFeed|null>(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const wrapper=useRef<HTMLDivElement>(null);
  const bell=useRef<HTMLButtonElement>(null);
  const panelId=useId();
  useEffect(()=>{
    const controller=new AbortController();let active=true,running=false;
    async function refresh() {
      if(running||document.visibilityState==='hidden')return;
      running=true;
      try {
        const next=await requestJson<RiderTaskNotificationFeed>('/api/dashboard/rider/notifications',{cache:'no-store',signal:controller.signal});
        if(!active)return;
        setFeed(next);setError('');
        const unread=next.notifications.filter(item=>!item.read).map(item=>item.taskId);
        if(open&&unread.length) {
          await requestJson('/api/dashboard/rider/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskIds:unread}),signal:controller.signal});
          if(active)setFeed({...next,unreadCount:Math.max(0,next.unreadCount-unread.length),notifications:next.notifications.map(item=>({...item,read:true}))});
        }
      } catch(reason) {if(active)setError(reason instanceof Error?reason.message:'Notifications could not be loaded.');}
      finally{running=false;}
    }
    void refresh();
    const interval=window.setInterval(()=>void refresh(),30000);
    const onFocus=()=>void refresh();
    window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
    return()=>{active=false;controller.abort();window.clearInterval(interval);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};
  },[open,retry]);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!wrapper.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);bell.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  const unread=feed?.unreadCount??0;
  return <div ref={wrapper} className="relative">
    <button ref={bell} type="button" aria-label={`Task notifications${unread?`, ${unread} unread`:''}`} aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)} className={`relative grid size-10 place-items-center rounded-xl border transition focus-visible:outline-2 focus-visible:outline-[#61bb46] ${open?'border-[#9ec895] bg-[#edf6e9] text-[#276431]':'border-[#dce8dc] bg-white text-[#536455] hover:bg-[#f5faf2]'}`}>
      <Icon name="bell" size={21}/>
      {unread>0&&<span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-[#df7c28] px-1 text-[10px] font-bold leading-4 text-white">{unread>99?'99+':unread}</span>}
    </button>
    {open&&<section id={panelId} aria-label="Task notifications" className="absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#dce8dc] bg-white shadow-[0_12px_45px_rgba(25,45,33,.16)]">
      <div className="flex items-center justify-between border-b border-[#e7ede5] bg-[#f5faf2] p-4"><div><h2 className="text-sm font-bold text-[#203526]">My task notifications</h2><p className="mt-1 text-xs text-[#718073]">New assignments for you</p></div><button type="button" aria-label="Close notifications" onClick={()=>{setOpen(false);bell.current?.focus();}} className="grid size-8 place-items-center rounded-lg text-lg text-[#536455] hover:bg-white">×</button></div>
      {error&&<div role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}<button type="button" onClick={()=>setRetry(value=>value+1)} className="ml-2 font-bold underline">Retry</button></div>}
      {!feed&&!error&&<p role="status" className="p-6 text-center text-sm text-[#718073]">Loading notifications…</p>}
      {feed?.notifications.length===0&&<div className="p-7 text-center"><span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#edf6e9] text-[#276431]"><Icon name="bell" size={23}/></span><p className="text-sm font-semibold text-[#203526]">No task notifications</p><p className="mt-1 text-xs text-[#718073]">Your new assignments will appear here.</p></div>}
      <ul className="max-h-80 overflow-y-auto">{feed?.notifications.map(item=><li key={item.taskId} className="border-b border-[#edf1eb] last:border-0"><Link href={`/dashboard/rider/tasks#task-${encodeURIComponent(item.taskId)}`} onClick={()=>setOpen(false)} className="flex gap-3 p-4 transition hover:bg-[#f7faf5]"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#e9f3e3] text-[#276431]"><Icon name="box" size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#203526]">{item.taskType}</span><span className="mt-1 block text-xs text-[#536455]">{item.boxId}{item.area?` · ${item.area}`:''}</span><span className="mt-1 block text-[11px] text-[#718073]">{item.taskDate} · {item.taskId}</span></span>{!item.read&&<span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-[#df7c28]"/>}</Link></li>)}</ul>
      <Link href="/dashboard/rider/tasks" onClick={()=>setOpen(false)} className="block border-t border-[#e7ede5] p-3 text-center text-xs font-bold text-[#276431] hover:bg-[#f7faf5]">View all my tasks →</Link>
    </section>}
  </div>;
}

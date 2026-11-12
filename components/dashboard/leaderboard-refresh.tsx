'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export default function LeaderboardRefresh(){
 const router=useRouter();
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&navigator.onLine)router.refresh();};const timer=window.setInterval(refresh,30000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};},[router]);
 return <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#718073]"><span className="size-1.5 rounded-full bg-[#78a75e]"/>Updates automatically</span>;
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RiderDetailsRefresh() {
  const router=useRouter();
  useEffect(()=>{
    let lastRefresh=0;
    const refresh=()=>{
      if(document.visibilityState==='hidden'||Date.now()-lastRefresh<5000)return;
      lastRefresh=Date.now();router.refresh();
    };
    const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[router]);
  return null;
}

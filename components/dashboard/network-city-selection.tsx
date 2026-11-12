'use client';
import {createContext,useContext,useMemo,useState,type ReactNode} from 'react';
import Link from 'next/link';
const Selection=createContext<{cityId:string;setCityId:(id:string)=>void}|null>(null);
export function NetworkCitySelection({initialCity,children}:{initialCity:string;children:ReactNode}){
 const [cityId,setCityId]=useState(initialCity);
 const value=useMemo(()=>({cityId,setCityId}),[cityId]);
 return <Selection.Provider value={value}>{children}</Selection.Provider>;
}
export function useNetworkCity(){return useContext(Selection);}
export function SelectedCityInventoryLink({href,className,children}:{href:string;className?:string;children:ReactNode}){
 const selected=useNetworkCity();
 const params=new URLSearchParams(href.split('?')[1]||'');
 if(selected?.cityId)params.set('city',selected.cityId);
 return <Link href={selected?`${href.split('?')[0]}?${params}`:href} className={className}>{children}</Link>;
}

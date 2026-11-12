'use client';
import {useTransition,type FormEvent,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
type Props={path:string;stateKey:string;children:ReactNode;className?:string};
export default function AutoFilterForm(props:Props){return <FilterForm key={`${props.path}:${props.stateKey}`} {...props}/>;}
function FilterForm({path,children,className}:Props){
 const router=useRouter();const [pending,startTransition]=useTransition();
 function navigate(form:HTMLFormElement){if(!form.checkValidity())return;const query=new URLSearchParams();for(const [key,value] of new FormData(form))if(typeof value==='string')query.set(key,value);const suffix=query.toString();startTransition(()=>router.push(suffix?`${path}?${suffix}`:path,{scroll:false}));}
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();navigate(event.currentTarget);}
 return <form action={path} onSubmit={submit} onChange={event=>navigate(event.currentTarget)} aria-label="Dashboard filters" aria-busy={pending} className={className||'mb-6 flex flex-wrap items-center gap-3'}><fieldset disabled={pending} className="contents">{children}</fieldset><span role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-[#718073]">{pending&&<><span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-[#dce8dc] border-t-[#276431] motion-reduce:animate-none"/>Updating results…</>}</span></form>;
}

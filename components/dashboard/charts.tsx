"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CSSProperties } from "react";
import type { ChartDatum } from "@/lib/dashboard-types";

const palette = ["#276431", "#61bb46", "#1d65d5", "#d98a32", "#9675c7", "#86a889"];
const pkr = (value: unknown) => `Rs ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;

type CollectionPoint = {
  label: string;
  collections: number | null;
};

type ChartProps = {
  data: ChartDatum[];
  height?: number;
};

export function CollectionTrendChart({ data, height = 300, seriesLabel = 'Recorded collections' }: { data: CollectionPoint[]; height?: number; seriesLabel?: string }) {
  const multipleYears=new Set(data.map(point=>point.label.slice(0,4))).size>1;
  const monthLabel=(value:string,long=false)=>/^20\d{2}-\d{2}$/.test(value)?new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US',{month:long?'long':'short',...(long?{year:'numeric' as const}:multipleYears?{year:'2-digit' as const}:{}),timeZone:'UTC'}):value;
  return <div className="w-full min-w-0 overflow-x-auto"><div style={{ height, "--collection-period-count":data.length } as CSSProperties} data-multiple-years={multipleYears ? "true" : "false"} className="collection-trend-plot w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}><defs><linearGradient id="collectionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61bb46" stopOpacity={0.23}/><stop offset="95%" stopColor="#61bb46" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="label" interval={0} tickFormatter={value=>monthLabel(String(value))} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={18}/><YAxis tickFormatter={value=>new Intl.NumberFormat('en-PK',{notation:'compact',maximumFractionDigits:1}).format(value)} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} width={54}/><Tooltip labelFormatter={value=>monthLabel(String(value),true)} formatter={(value) => [pkr(value), seriesLabel]} labelStyle={{ color: "#192d21", fontWeight: 700 }} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Area type="monotone" dataKey="collections" stroke="#276431" strokeWidth={3} fill="url(#collectionArea)" activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#276431" }}/></AreaChart></ResponsiveContainer></div></div>;
}

type BreakdownBarChartProps = ChartProps & {
  valueKey?: string;
  valueFormat?: "number" | "currency";
  horizontal?: boolean;
  periodAxis?: boolean;
};

export function CityCollectionBars({data,height=280}:ChartProps){
 const max=Math.max(0,...data.map(city=>Number(city.value??0)));
 return <div style={{height}} className="overflow-y-auto overscroll-contain pr-3" role="region" aria-label="City collection comparison" tabIndex={0}><ul className="space-y-4 pb-1">{data.map((city,index)=><li key={city.name} className="min-w-0"><div className="flex items-start justify-between gap-3 text-xs leading-5"><span className="min-w-0 flex-1 break-words font-semibold text-[#536455]">{city.name}</span><b className="shrink-0 tabular-nums text-[#276431]">{city.value==null?'Not reported':pkr(city.value)}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0f5ed]"><div className="h-full rounded-full" style={{width:`${max>0?Math.max(0,Number(city.value??0))/max*100:0}%`,backgroundColor:city.color||palette[index%palette.length]}}/></div></li>)}</ul></div>;
}

export function BreakdownBarChart({ data, valueKey = "value", valueFormat = "number", height = 300, horizontal = false, periodAxis = false }: BreakdownBarChartProps) {
  const formatted = (value: unknown) => valueFormat === "currency" ? pkr(value) : Math.round(Number(value) || 0).toLocaleString("en-PK");
  if (horizontal) return <div style={{ height }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 0 }}><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" horizontal={false}/><XAxis type="number" tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false}/><YAxis type="category" dataKey="name" width={100} tick={{ fill: "#536455", fontSize: 12 }} tickLine={false} axisLine={false}/><Tooltip formatter={(value) => [formatted(value), ""]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Bar dataKey={valueKey} fill="#276431" radius={[0, 7, 7, 0]} maxBarSize={28}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>;
  return <div className="w-full min-w-0 overflow-x-auto"><div style={{ height, minWidth: periodAxis ? data.length*36+64 : undefined }} className="w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="name" interval={periodAxis ? 0 : undefined} tickFormatter={periodAxis ? (value) => String(value).length>4 ? String(value).slice(0,3) : String(value) : undefined} height={28} tickMargin={8} tick={{ fill: "#536455", fontSize: periodAxis ? 11 : 12 }} tickLine={false} axisLine={false}/><YAxis tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} width={48}/><Tooltip formatter={(value) => [formatted(value), ""]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Bar dataKey={valueKey} fill="#276431" radius={[7, 7, 0, 0]} maxBarSize={54}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></div>;
}

export function StatusDonutChart({ data, height = 260 }: ChartProps) {
  return <div style={{ height }} className="relative w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="78%" paddingAngle={3} stroke="#fff" strokeWidth={3}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Pie><Tooltip formatter={(value, name) => [`${value} records`, name]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-[#203526]">{data.reduce((sum, item) => sum + Number(item.value || 0), 0).toLocaleString("en-PK")}</span><span className="text-xs text-[#718073]">records</span></div></div>;
}

export function ChartLegend({ data }: { data: ChartDatum[] }) {
  return <ul className="mt-3 grid gap-2 sm:grid-cols-2">{data.map((item, index) => <li key={item.name} className="flex items-center gap-2 text-sm text-[#536455]"><i className="size-2.5 rounded-full" style={{ backgroundColor: item.color || palette[index % palette.length] }}/><span className="flex-1">{item.name}</span><b>{Number(item.value || 0).toLocaleString("en-PK")}</b></li>)}</ul>;
}

export function MoneyDonutChart({data,centerLabel}:{data:ChartDatum[];centerLabel:string}) {
 const slices=data.filter(item=>Number(item.value)>0);
 const total=slices.reduce((sum,item)=>sum+Number(item.value),0);
 if(!total) return <div className="grid min-h-80 place-items-center rounded-2xl bg-[#f7faf5] p-6 text-center text-sm text-[#718073]">No positive reported amounts for this selection.</div>;
 const compact=new Intl.NumberFormat('en-PK',{notation:'compact',maximumFractionDigits:1}).format(total);
 return <div>
  <div className="relative h-64 min-w-0" role="img" aria-label={`${centerLabel}: ${pkr(total)}`}>
   <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={slices.length>1?2:0} stroke="#fff" strokeWidth={3}>{slices.map((item,index)=><Cell key={item.name} fill={item.color||palette[index%palette.length]}/>)}</Pie><Tooltip formatter={(value,name)=>[`${pkr(value)} · ${(Number(value)/total*100).toFixed(1)}%`,name]} contentStyle={{border:'1px solid #dce8dc',borderRadius:12,fontSize:13}}/></PieChart></ResponsiveContainer>
   <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs font-semibold text-[#718073]">PKR</span><b className="text-3xl tracking-tight text-[#203526]">{compact}</b><span className="text-xs text-[#718073]">{centerLabel}</span></div>
  </div>
  <ul className="mt-3 space-y-3">{slices.map((item,index)=><li key={item.name} className="flex items-center gap-2 text-xs text-[#536455]"><i className="size-2.5 shrink-0 rounded-full" style={{backgroundColor:item.color||palette[index%palette.length]}}/><span className="min-w-0 flex-1">{item.name}</span><b className="tabular-nums text-[#203526]">{pkr(item.value)}</b><span className="w-12 text-right tabular-nums">{(Number(item.value)/total*100).toFixed(1)}%</span></li>)}</ul>
 </div>;
}

export function ChannelComparisonChart({data}:{data:{month:string;public:number|null;branch:number|null}[]}) {
 return <div><div className="h-80 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:16,right:12,left:4,bottom:10}}><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="month" tickFormatter={month=>new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'})} tick={{fontSize:11,fill:'#718073'}} tickLine={false} axisLine={false} minTickGap={20}/><YAxis width={58} tickFormatter={value=>new Intl.NumberFormat('en-PK',{notation:'compact'}).format(value)} tick={{fontSize:11,fill:'#718073'}} tickLine={false} axisLine={false}/><Tooltip formatter={(value,name)=>[pkr(value),name]} contentStyle={{border:'1px solid #dce8dc',borderRadius:12,fontSize:13}}/><Line name="Public" dataKey="public" type="linear" stroke={palette[0]} strokeWidth={3} dot={false}/><Line name="Branch" dataKey="branch" type="linear" stroke={palette[1]} strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div><div className="mt-3 flex justify-center gap-6 text-xs text-[#536455]"><span>● Public</span><span className="text-[#61bb46]">● Branch</span></div></div>;
}

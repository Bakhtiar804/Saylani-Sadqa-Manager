"use client";

import {
  Area,
  AreaChart,
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
import type { ChartDatum } from "@/lib/dashboard-types";

const palette = ["#276431", "#61bb46", "#1d65d5", "#d98a32", "#9675c7", "#86a889"];
const pkr = (value: unknown) => `Rs ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;

type CollectionPoint = {
  label: string;
  collections: number;
};

type ChartProps = {
  data: ChartDatum[];
  height?: number;
};

export function CollectionTrendChart({ data, height = 300 }: { data: CollectionPoint[]; height?: number }) {
  return <div style={{ height }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}><defs><linearGradient id="collectionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61bb46" stopOpacity={0.23}/><stop offset="95%" stopColor="#61bb46" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="label" tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={18}/><YAxis tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} width={54}/><Tooltip formatter={(value) => [pkr(value), "Verified collections"]} labelStyle={{ color: "#192d21", fontWeight: 700 }} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Area type="monotone" dataKey="collections" stroke="#276431" strokeWidth={3} fill="url(#collectionArea)" activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#276431" }}/></AreaChart></ResponsiveContainer></div>;
}

type BreakdownBarChartProps = ChartProps & {
  valueKey?: string;
  valueFormat?: "number" | "currency";
  horizontal?: boolean;
};

export function BreakdownBarChart({ data, valueKey = "value", valueFormat = "number", height = 300, horizontal = false }: BreakdownBarChartProps) {
  const formatted = (value: unknown) => valueFormat === "currency" ? pkr(value) : Math.round(Number(value) || 0).toLocaleString("en-PK");
  if (horizontal) return <div style={{ height }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 0 }}><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" horizontal={false}/><XAxis type="number" tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false}/><YAxis type="category" dataKey="name" width={100} tick={{ fill: "#536455", fontSize: 12 }} tickLine={false} axisLine={false}/><Tooltip formatter={(value) => [formatted(value), ""]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Bar dataKey={valueKey} fill="#276431" radius={[0, 7, 7, 0]} maxBarSize={28}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>;
  return <div style={{ height }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}><CartesianGrid stroke="#e9efe7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="name" tick={{ fill: "#536455", fontSize: 12 }} tickLine={false} axisLine={false}/><YAxis tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} tick={{ fill: "#718073", fontSize: 12 }} tickLine={false} axisLine={false} width={48}/><Tooltip formatter={(value) => [formatted(value), ""]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/><Bar dataKey={valueKey} fill="#276431" radius={[7, 7, 0, 0]} maxBarSize={54}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>;
}

export function StatusDonutChart({ data, height = 260 }: ChartProps) {
  return <div style={{ height }} className="relative w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="78%" paddingAngle={3} stroke="#fff" strokeWidth={3}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || palette[index % palette.length]}/>)}</Pie><Tooltip formatter={(value, name) => [`${value} records`, name]} contentStyle={{ border: "1px solid #dce8dc", borderRadius: 12, fontSize: 13 }}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-[#203526]">{data.reduce((sum, item) => sum + Number(item.value || 0), 0).toLocaleString("en-PK")}</span><span className="text-xs text-[#718073]">records</span></div></div>;
}

export function ChartLegend({ data }: { data: ChartDatum[] }) {
  return <ul className="mt-3 grid gap-2 sm:grid-cols-2">{data.map((item, index) => <li key={item.name} className="flex items-center gap-2 text-sm text-[#536455]"><i className="size-2.5 rounded-full" style={{ backgroundColor: item.color || palette[index % palette.length] }}/><span className="flex-1">{item.name}</span><b>{Number(item.value || 0).toLocaleString("en-PK")}</b></li>)}</ul>;
}

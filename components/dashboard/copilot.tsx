"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brand } from "@/components/landing/brand";
import { BreakdownBarChart, ChannelComparisonChart, CollectionTrendChart, MoneyDonutChart } from "@/components/dashboard/charts";

type ChatPart = { type?: string; text?: string; output?: unknown };

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "City Admin",
  city_manager: "Branch Admin",
  rider: "Rider",
};

function formatPKR(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "PKR 0";
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

function ChartVisual({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const chart = output as { kind?: string; chartType?: string; title?: string; xLabel?: string; yLabel?: string; label?: string; unit?: string; data?: Array<Record<string, unknown>>; source?: string | { name?: string }; period?: string };
  if (chart.kind !== "chart" || !chart.data?.length) return null;
  const data = chart.data.map((row) => ({ name: String(row.name ?? row.month ?? ""), value: Number(row.value ?? 0), public: Number(row.public ?? 0), branch: Number(row.branch ?? 0) }));
  return <section className="mt-4 min-w-0 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(25,45,33,.04)]"><p className="text-xs font-bold text-[#36513d]">{chart.title || "Analytics chart"}</p><p className="mb-2 text-[10px] text-[var(--muted-foreground)]">{chart.yLabel || chart.label || chart.unit || "Value"}{chart.xLabel ? ` by ${chart.xLabel.toLowerCase()}` : ""}{chart.period ? ` · ${chart.period}` : ""}</p>{chart.chartType === "line" && <CollectionTrendChart data={data.map((row) => ({ label: row.name, collections: row.value }))} height={220} seriesLabel={chart.yLabel || chart.unit || "Value"} />}{chart.chartType === "channel_line" && <ChannelComparisonChart data={data.map((row) => ({ month: row.name, public: row.public, branch: row.branch }))} />}{chart.chartType === "bar" && <BreakdownBarChart data={data} valueFormat={chart.unit === "PKR" ? "currency" : "number"} horizontal height={Math.max(220, data.length * 42)} />}{chart.chartType === "donut" && <MoneyDonutChart data={data} centerLabel={chart.label || chart.unit || "Records"} />}{(chart.source || chart.period) && <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">{chart.period ? `Period: ${chart.period}` : ""}{chart.source ? ` · Source: ${typeof chart.source === "string" ? chart.source : chart.source.name || "permitted records"}` : ""}</p>}</section>;
}

function TableVisual({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const table = output as { kind?: string; title?: string; columns?: string[]; rows?: unknown[][]; total?: number; source?: string; scope?: string };
  if (table.kind !== "table" || !table.columns || !table.rows) return null;
  const columns = table.columns;
  const rows = table.rows;
  return <section className="mt-4 min-w-0 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(25,45,33,.04)]"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#36513d]">{table.title || "Records"}</p><span className="text-[10px] text-[var(--muted-foreground)]">{table.total ?? rows.length} records</span></div><div className="max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)]"><table className="min-w-full text-left text-[11px]"><thead className="sticky top-0 bg-[var(--surface)] text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-[var(--border)] px-3 py-2 font-bold">{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[var(--border)] last:border-0">{columns.map((column, columnIndex) => <td key={`${rowIndex}-${column}`} className="max-w-56 px-3 py-2 align-top text-[var(--foreground)]">{column.toLowerCase().includes("pkr") || column.toLowerCase().includes("amount") || column.toLowerCase().includes("cost") || column.toLowerCase().includes("difference") ? formatPKR(row[columnIndex]) : String(row[columnIndex] ?? "—")}</td>)}</tr>)}</tbody></table></div>{(table.scope || table.source) && <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">{table.scope || "Permitted scope"}{table.source ? ` · Source: ${table.source}` : ""}</p>}</section>;
}

function OutputVisual({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const kind = (output as { kind?: string }).kind;
  if (kind === "chart") return <ChartVisual output={output} />;
  if (kind === "table") return <TableVisual output={output} />;
  return <SummaryVisual output={output} />;
}

function SummaryVisual({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const value = output as { kind?: string; title?: string; period?: string; source?: { name?: string } | string | null; totals?: Record<string, unknown>; monthly?: Array<Record<string, unknown>>; byCity?: Array<{ name: string; value: number | null }>; categories?: Array<{ name: string; value: number | null }>; visuals?: { trend?: { title?: string; xLabel?: string; yLabel?: string } | null; channels?: { title?: string; xLabel?: string; yLabel?: string } | null; cities?: { title?: string; xLabel?: string; yLabel?: string } | null; expenses?: { title?: string; label?: string } | null } };
  if (value.kind === "rider_summary") {
    return <div className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(25,45,33,.04)] sm:grid-cols-4"><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tasks</span><b className="mt-1 block text-lg text-[var(--primary)]">{Number(value.totals?.tasks ?? 0).toLocaleString("en-PK")}</b></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Completed</span><b className="mt-1 block text-lg text-[var(--primary)]">{Number(value.totals?.completedTasks ?? 0).toLocaleString("en-PK")}</b></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Collections</span><b className="mt-1 block text-lg text-[var(--primary)]">{Number(value.totals?.collections ?? 0).toLocaleString("en-PK")}</b></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Collected</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.collectionTotal)}</b></div></div>;
  }
  if (value.kind !== "summary") return null;
  const monthly = value.monthly?.filter((row) => Number(row.collections) > 0).slice(-12) ?? [];
  const byCity = value.byCity?.filter((row) => Number(row.value) > 0).slice(0, 8) ?? [];
  const categories = value.categories?.filter((row) => Number(row.value) > 0).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 8) ?? [];
  const trend = monthly.map((row) => ({ label: String(row.month), collections: Number(row.collections ?? 0) }));
  const cities = byCity.map((row) => ({ name: String(row.name), value: Number(row.value ?? 0) }));
  const expenseData = categories.map((row) => ({ name: String(row.name), value: Number(row.value ?? 0) }));
  const chartChoice = monthly.length > 1 ? "trend" : byCity.length > 1 ? "cities" : categories.length > 1 ? "expenses" : null;
  const visualTitle = (fallback: string, configured?: string) => configured || fallback;
  return (
    <div className="mt-4 grid min-w-0 gap-3 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(25,45,33,.04)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Collections</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.collection)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Public</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.public)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Branch</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.branch)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Expenses</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.expenses)}</b></div>
      </div>
      {chartChoice === "trend" && <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="mb-1 text-xs font-bold text-[#36513d]">{visualTitle("Monthly collection trend", value.visuals?.trend?.title)}</p><p className="mb-2 text-[10px] text-[var(--muted-foreground)]">{value.visuals?.trend?.yLabel || "PKR collected"} by {value.visuals?.trend?.xLabel || "month"}</p><CollectionTrendChart data={trend} height={220} seriesLabel="Total collections" /></section>}
      {chartChoice === "cities" && <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="mb-1 text-xs font-bold text-[#36513d]">{visualTitle("Collections by city", value.visuals?.cities?.title)}</p><p className="mb-2 text-[10px] text-[var(--muted-foreground)]">PKR collected by city</p><BreakdownBarChart data={cities} valueFormat="currency" horizontal height={Math.max(220, cities.length * 42)} /></section>}
      {chartChoice === "expenses" && <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="mb-1 text-xs font-bold text-[#36513d]">{visualTitle("Expenses by category", value.visuals?.expenses?.title)}</p><p className="mb-2 text-[10px] text-[var(--muted-foreground)]">{value.visuals?.expenses?.label || "PKR expenses"}</p><MoneyDonutChart data={expenseData} centerLabel="Expenses" /></section>}
      {(value.source || value.period) && <p className="text-[10px] text-[var(--muted-foreground)]">Scope: {value.period || "available records"}{value.source ? ` · Source: ${typeof value.source === "string" ? value.source : value.source.name || "permitted reports"}` : ""}</p>}
    </div>
  );
}

function MessageContent({ message }: { message: UIMessage }) {
  const outputs = message.parts
    .map((part) => part as ChatPart)
    .filter((part) => part.type?.startsWith("tool-") && part.output)
    .map((part) => part.output);
  const visibleOutputs = outputs.filter((output) => {
    const kind = output && typeof output === "object" && "kind" in output ? String(output.kind) : "";
    if (kind !== "chart" && kind !== "table") return true;
    return outputs.slice(0, outputs.indexOf(output)).every((previous) => {
      const previousKind = previous && typeof previous === "object" && "kind" in previous ? String(previous.kind) : "";
      return previousKind !== kind;
    });
  });
  return <>{message.parts.filter((part) => part.type === "text").map((part, index) => <div key={index} className="space-y-3 leading-6 [&_a]:font-semibold [&_a]:text-[var(--primary)] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:whitespace-pre-wrap [&_strong]:font-medium [&_table]:w-full [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:pl-4">{"text" in part ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown> : null}</div>)}{visibleOutputs.map((output, index) => <OutputVisual key={index} output={output} />)}</>;
}

function Conversation({ threadId, initialMessages, onSaved, compact = false, standalone = false }: { threadId: string; initialMessages: UIMessage[]; onSaved: () => void; compact?: boolean; standalone?: boolean }) {
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { threadId } }),
    onFinish: onSaved,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const sendCurrentMessage = () => {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    void sendMessage({ text });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    sendCurrentMessage();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  };
  return <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
    <div className={`${messages.length > 0 ? "overflow-y-auto" : "overflow-hidden"} min-h-0 min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8`}>
      {messages.length === 0 ? <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center pb-8 text-center">
        <div className="mb-6 grid size-16 place-items-center rounded-[22px] border border-[#dcebd8] bg-[var(--surface)] text-3xl font-bold text-[var(--primary)] shadow-[0_12px_30px_rgba(39,100,49,.08)]">▥</div>
        <h1 className={`${compact ? "text-2xl" : "text-3xl sm:text-5xl"} max-w-3xl font-semibold tracking-[-.04em] text-[var(--foreground)]`}>How can I help with your <span className="text-[var(--primary)]">Saylani data</span>?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">Ask questions, understand trends, compare cities, and explore the reports available to your account.</p>
      </div> : <div className="mx-auto min-w-0 max-w-6xl space-y-5">{messages.map((message) => <div key={message.id} className={`flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-full overflow-hidden break-words rounded-[22px] px-4 py-3.5 text-sm shadow-[0_5px_18px_rgba(25,45,33,.04)] ${message.role === "user" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"}`}><MessageContent message={message} /></div></div>)}{busy && <div className="flex items-center gap-2 px-1 text-xs text-[var(--muted-foreground)]"><span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" /> Reading permitted records… <button type="button" onClick={stop} className="font-bold text-[var(--primary)]">Stop</button></div>}</div>}
    </div>
    <form onSubmit={submit} className={`${standalone ? "fixed bottom-0 left-[258px] right-0 max-[1100px]:left-[220px] max-[900px]:left-[72px] max-[600px]:left-0" : "sticky bottom-0"} z-10 shrink-0 bg-[var(--background)] px-4 pb-3 pt-2 sm:px-6 lg:px-8`}><div className="mx-auto flex w-full max-w-none items-end gap-2 rounded-[22px] border border-[#c9dbcc] bg-[var(--card)] p-2 shadow-[0_12px_30px_rgba(25,45,33,.08)] focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[#61bb46]/10"><button type="button" className="mb-1 grid size-9 shrink-0 place-items-center rounded-xl text-xl text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="More options">＋</button><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} rows={1} placeholder="Ask about your Saylani data…" className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]" /><button type="submit" disabled={busy || !input.trim()} className="mb-1 grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-xl text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d5127] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question">↑</button></div></form>
  </div>;
}

export default function Copilot({ userRole, standalone = false }: { userRole: string; standalone?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fullScreen = false;
  const [threadId, setThreadId] = useState(() => `thread-${crypto.randomUUID()}`);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loaded, setLoaded] = useState(standalone);
  useEffect(() => {
    const openInsight = () => { setLoaded(true); setOpen(true); };
    window.addEventListener("saylani:open-insight", openInsight);
    return () => window.removeEventListener("saylani:open-insight", openInsight);
  }, []);
  const newChat = () => { setLoaded(true); setInitialMessages([]); setThreadId(`thread-${crypto.randomUUID()}`); };
  if (pathname === "/dashboard/insights" && !standalone) return null;
  if (!open && !standalone) return <button type="button" onClick={() => { setLoaded(true); setOpen(true); }} className="fixed bottom-7 right-7 z-40 flex items-center gap-2 rounded-full border border-[#d8ead1] bg-white px-4 py-3 text-sm font-extrabold text-[#276431] shadow-[0_12px_30px_rgba(39,100,49,.18)] transition hover:-translate-y-0.5 hover:border-[#b5d9aa] hover:bg-[#f7fcf5] max-[600px]:bottom-[88px] max-[600px]:right-4"><span className="grid size-6 place-items-center rounded-full bg-[#e3f3dc] text-[#276431]">✦</span> Saylani AI</button>;
  const shell = "fixed bottom-6 right-6 z-50 h-[min(720px,calc(100vh-48px))] w-[min(460px,calc(100vw-32px))] rounded-[24px] shadow-[0_24px_70px_rgba(25,45,33,.22)] max-[600px]:inset-x-0 max-[600px]:bottom-0 max-[600px]:right-auto max-[600px]:h-[min(88dvh,720px)] max-[600px]:w-full max-[600px]:max-w-none max-[600px]:rounded-b-none max-[600px]:rounded-t-[24px]";
  if (standalone) return <div className="relative -mx-10 -mb-8 -mt-8 flex h-[calc(100dvh-128px)] max-h-[calc(100dvh-128px)] w-auto min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)] max-[1100px]:-mx-6 max-[600px]:-mx-4 max-[600px]:-mt-5 max-[600px]:h-[calc(100dvh-112px)] max-[600px]:max-h-[calc(100dvh-112px)]">
    <main className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-5 sm:px-8"><div className="flex items-center gap-3"><div className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 shadow-sm"><Brand className="w-[92px]" /></div><div><p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Saylani AI</p><p className="text-[10px] text-[var(--muted-foreground)]">Your Saylani data assistant</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={newChat} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--surface)]">＋ New</button>{standalone ? <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--primary)]">Read-only</span> : <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="Close Saylani AI">×</button>}</div></header>{!loaded ? <div className="p-8 text-sm text-[var(--muted-foreground)]">Loading your conversation…</div> : <Conversation key={threadId} threadId={threadId} initialMessages={initialMessages} onSaved={() => undefined} standalone={standalone} />}</main>
  </div>;
  return <div className={`${shell} flex min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--card)] ${fullScreen ? "md:rounded-[24px] md:shadow-[0_24px_80px_rgba(25,45,33,.12)]" : ""}`}><header className={`relative flex min-h-[50px] items-center justify-between overflow-hidden border-b border-[var(--border)] bg-[var(--card)] px-3 py-1.5 ${fullScreen ? "md:ml-[216px] md:w-[calc(100%-216px)]" : ""}`}><div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" /><div className="flex items-center gap-2"><div className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 shadow-sm"><Brand className="w-[82px]" /></div><div><p className="text-xs font-extrabold tracking-tight text-[var(--foreground)]">Saylani AI</p><p className="text-[8px] font-medium text-[var(--muted-foreground)]">{roleLabels[userRole] ?? userRole} · read-only</p></div></div><div className="flex items-center gap-0.5"><button type="button" onClick={newChat} title="New chat" className="rounded-md px-1.5 py-1 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--surface)]">＋</button><button type="button" onClick={() => router.push("/dashboard/insights")} title="Open Saylani AI page" className="rounded-md px-1.5 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)]">⛶</button><button type="button" onClick={() => setOpen(false)} title="Close" className="rounded-md px-1.5 py-1 text-base leading-none text-[var(--muted-foreground)] hover:bg-[var(--surface)]">×</button></div></header><div className="flex min-h-0 flex-1"><main className="flex min-h-0 flex-1 flex-col"><div className="flex min-h-0 flex-1 flex-col">{!loaded ? <div className="p-5 text-sm text-[var(--muted-foreground)]">Loading your conversation…</div> : <Conversation key={threadId} threadId={threadId} initialMessages={initialMessages} compact onSaved={() => undefined} />}</div></main></div></div>;
}

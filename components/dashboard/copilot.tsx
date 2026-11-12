"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brand } from "@/components/landing/brand";

type Thread = { id: string; title: string; updatedAt: string };
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

function SummaryVisual({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const value = output as { kind?: string; title?: string; totals?: Record<string, unknown>; monthly?: Array<Record<string, unknown>>; byCity?: Array<{ name: string; value: number | null }> };
  if (value.kind !== "summary") return null;
  const monthly = value.monthly?.filter((row) => Number(row.collections) > 0).slice(-8) ?? [];
  const byCity = value.byCity?.filter((row) => Number(row.value) > 0).slice(0, 6) ?? [];
  const max = Math.max(...monthly.map((row) => Number(row.collections)), 1);
  return (
    <div className="mt-4 grid min-w-0 gap-3 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgba(25,45,33,.04)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Collections</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.collection)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Public</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.public)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Branch</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.branch)}</b></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Expenses</span><b className="mt-1 block text-sm text-[var(--primary)]">{formatPKR(value.totals?.expenses)}</b></div>
      </div>
      {monthly.length > 0 && <div><p className="mb-2 text-xs font-bold text-[#36513d]">Monthly collection trend</p><div className="flex h-28 items-end gap-2">{monthly.map((row) => <div key={String(row.month)} className="flex min-w-0 flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-md bg-[#61bb46]" style={{ height: `${Math.max(8, (Number(row.collections) / max) * 88)}px` }} title={formatPKR(row.collections)} /><span className="truncate text-[9px] text-[#718073]">{String(row.month).slice(5)}</span></div>)}</div></div>}
      {byCity.length > 1 && <div><p className="mb-2 text-xs font-bold text-[#36513d]">Top cities</p><div className="grid gap-2">{byCity.map((row) => { const width = Math.max(8, (Number(row.value) / Number(byCity[0].value || 1)) * 100); return <div key={row.name} className="grid grid-cols-[90px_1fr_auto] items-center gap-2 text-[10px]"><span className="truncate text-[#536657]">{row.name}</span><div className="h-2 rounded-full bg-[#e6f0e1]"><div className="h-2 rounded-full bg-[#d4a63b]" style={{ width: `${width}%` }} /></div><span className="text-[#36513d]">{formatPKR(row.value)}</span></div>; })}</div></div>}
    </div>
  );
}

function MessageContent({ message }: { message: UIMessage }) {
  const outputs = message.parts
    .map((part) => part as ChatPart)
    .filter((part) => part.type?.startsWith("tool-") && part.output)
    .map((part) => part.output);
  return <>{message.parts.filter((part) => part.type === "text").map((part, index) => <div key={index} className="space-y-3 leading-6 [&_a]:font-semibold [&_a]:text-[var(--primary)] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_table]:w-full [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:pl-4">{"text" in part ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown> : null}</div>)}{outputs.map((output, index) => <SummaryVisual key={index} output={output} />)}</>;
}

function Conversation({ threadId, initialMessages, onSaved, suggestions, compact = false }: { threadId: string; initialMessages: UIMessage[]; onSaved: () => void; suggestions: string[]; compact?: boolean }) {
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { threadId } }),
    onFinish: onSaved,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    void sendMessage({ text });
  };
  const cards = [
    { icon: "▥", title: "Analyze collections", text: "Understand donations and totals in your permitted scope.", prompt: suggestions[1] ?? suggestions[0] },
    { icon: "↗", title: "Compare channels", text: "Compare public, branch, city, and time-based performance.", prompt: "Compare public and branch collections" },
    { icon: "♙", title: "Explore riders", text: "Find rider records and activity you are allowed to view.", prompt: suggestions[0] },
    { icon: "✦", title: "Find insights", text: "Discover trends, patterns, and useful explanations.", prompt: "Find the most important insight in my data" },
  ];
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--background)]">
    <div className={`${messages.length > 0 ? "overflow-y-auto" : "overflow-hidden"} min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12`}>
      {messages.length === 0 ? <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center pb-8 text-center">
        <div className="mb-6 grid size-16 place-items-center rounded-[22px] border border-[#dcebd8] bg-[var(--surface)] text-3xl font-bold text-[var(--primary)] shadow-[0_12px_30px_rgba(39,100,49,.08)]">▥</div>
        <h1 className={`${compact ? "text-2xl" : "text-3xl sm:text-5xl"} max-w-3xl font-black tracking-[-.04em] text-[var(--foreground)]`}>How can I help with your <span className="text-[var(--primary)]">Saylani data</span>?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">Ask questions, understand trends, compare cities, and explore the reports available to your account.</p>
        <div className={`${compact ? "mt-6 grid-cols-1" : "mt-10 max-[639px]:grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"} grid w-full gap-3 text-left`}>{cards.map((card) => <button key={card.title} type="button" onClick={() => void sendMessage({ text: card.prompt })} className="group min-h-[150px] rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-[0_8px_24px_rgba(25,45,33,.035)] transition hover:-translate-y-1 hover:border-[#a9d69d] hover:shadow-[0_14px_30px_rgba(39,100,49,.1)]"><span className="text-2xl font-bold text-[var(--primary)]">{card.icon}</span><strong className="mt-5 block text-base text-[var(--foreground)]">{card.title}</strong><span className="mt-2 block text-sm leading-5 text-[var(--muted-foreground)]">{card.text}</span><span className="mt-3 block text-lg text-[var(--primary)] transition group-hover:translate-x-1">→</span></button>)}</div>
      </div> : <div className="mx-auto min-w-0 max-w-3xl space-y-5">{messages.map((message) => <div key={message.id} className={`flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-full overflow-hidden break-words rounded-[22px] px-4 py-3.5 text-sm shadow-[0_5px_18px_rgba(25,45,33,.04)] ${message.role === "user" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"}`}><MessageContent message={message} /></div></div>)}{busy && <div className="flex items-center gap-2 px-1 text-xs text-[var(--muted-foreground)]"><span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" /> Reading permitted records… <button type="button" onClick={stop} className="font-bold text-[var(--primary)]">Stop</button></div>}</div>}
    </div>
    <form onSubmit={submit} className="shrink-0 px-5 pb-5 pt-2 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-5xl items-end gap-2 rounded-[22px] border border-[#c9dbcc] bg-[var(--card)] p-2 shadow-[0_12px_30px_rgba(25,45,33,.08)] focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[#61bb46]/10"><button type="button" className="mb-1 grid size-9 shrink-0 place-items-center rounded-xl text-xl text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="More options">＋</button><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} placeholder="Ask about your Saylani data…" className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]" /><button type="submit" disabled={busy || !input.trim()} className="mb-1 grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-xl text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d5127] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question">↑</button></div></form>
  </div>;
}

export default function Copilot({ userName, userRole, standalone = false }: { userName: string; userRole: string; standalone?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [threadId, setThreadId] = useState(() => `thread-${crypto.randomUUID()}`);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loaded, setLoaded] = useState(standalone);
  useEffect(() => {
    const openInsight = () => { setLoaded(true); setOpen(true); };
    window.addEventListener("saylani:open-insight", openInsight);
    return () => window.removeEventListener("saylani:open-insight", openInsight);
  }, []);
  const loadThreads = async () => { try { const response = await fetch("/api/chat/threads", { cache: "no-store" }); const data = await response.json(); setThreads(data.threads ?? []); } catch { /* The panel remains usable when history is unavailable. */ } };
  const loadThread = async (id: string) => { try { const response = await fetch(`/api/chat?threadId=${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); setInitialMessages(data.messages ?? []); setThreadId(id); setLoaded(true); } catch { setInitialMessages([]); setThreadId(id); setLoaded(true); } };
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => { void loadThreads(); }, 0); return () => window.clearTimeout(timer); }, [open]);
  const newChat = () => { setLoaded(true); setInitialMessages([]); setThreadId(`thread-${crypto.randomUUID()}`); };
  const prompts = useMemo(() => userRole === "rider" ? ["Show my rider statistics", "Summarize my assigned work"] : ["List the riders I can access", "Summarize collections for my scope", "Compare public and branch collections"], [userRole]);
  if (pathname === "/dashboard/insights" && !standalone) return null;
  if (!open && !standalone) return <button type="button" onClick={() => { setLoaded(true); setOpen(true); }} className="fixed bottom-7 right-7 z-40 flex items-center gap-2 rounded-full border border-[#d8ead1] bg-white px-4 py-3 text-sm font-extrabold text-[#276431] shadow-[0_12px_30px_rgba(39,100,49,.18)] transition hover:-translate-y-0.5 hover:border-[#b5d9aa] hover:bg-[#f7fcf5] max-[600px]:bottom-[88px] max-[600px]:right-4"><span className="grid size-6 place-items-center rounded-full bg-[#e3f3dc] text-[#276431]">✦</span> Insight Studio</button>;
  const shell = "fixed bottom-6 right-6 z-50 h-[min(720px,calc(100vh-48px))] w-[min(460px,calc(100vw-32px))] rounded-[24px] shadow-[0_24px_70px_rgba(25,45,33,.22)] max-[600px]:inset-x-0 max-[600px]:bottom-0 max-[600px]:right-auto max-[600px]:h-[min(88dvh,720px)] max-[600px]:w-full max-[600px]:max-w-none max-[600px]:rounded-b-none max-[600px]:rounded-t-[24px]";
  if (fullScreen || standalone) return <div className={`${standalone ? "flex h-[calc(100dvh-132px)] max-h-full w-full max-[600px]:h-[calc(100dvh-112px)]" : "fixed inset-0 z-50 md:inset-5 md:rounded-[26px] md:border md:shadow-[0_24px_80px_rgba(25,45,33,.14)]"} min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]`}>
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] px-5 py-6 max-md:hidden">
      <div className="flex items-center justify-between"><div><div className="mb-3 w-fit rounded-xl border border-[var(--border)] bg-white px-2 py-1 shadow-sm"><Brand className="w-[112px]" /></div><p className="text-lg font-black tracking-tight">Insight Studio</p><p className="text-xs text-[var(--muted-foreground)]">Your Saylani data assistant</p></div>{!standalone && <button type="button" onClick={() => setFullScreen(false)} className="rounded-lg px-2 py-1 text-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="Exit full screen">‹</button>}</div>
      <button type="button" onClick={newChat} className="mt-8 flex items-center gap-3 rounded-xl bg-[#e4f4e0] px-4 py-3 text-sm font-bold text-[var(--primary)] transition hover:bg-[#d8eed2]"><span className="text-xl">＋</span> New analysis</button>
      <label className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--muted-foreground)]"><span>⌕</span><input aria-label="Search analyses" placeholder="Search analyses…" className="w-full bg-transparent outline-none placeholder:text-[var(--muted-foreground)]" /></label>
      <p className="mb-2 mt-7 px-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--muted-foreground)]">Recent analyses</p>
      <div className="min-h-0 space-y-1 overflow-y-auto">{threads.map((thread) => <button key={thread.id} type="button" onClick={() => void loadThread(thread.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm transition ${thread.id === threadId ? "bg-[#e4f4e0] font-bold text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`}><span className="text-base">▢</span><span className="truncate">{thread.title}</span></button>)}{threads.length === 0 && <p className="px-2 text-xs leading-5 text-[var(--muted-foreground)]">Your saved analyses will appear here.</p>}</div>
      <div className="mt-auto flex items-center gap-3 border-t border-[var(--border)] pt-5"><span className="grid size-9 place-items-center rounded-full bg-[#e4f4e0] font-bold text-[var(--primary)]">{userName.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{userName}</p><p className="truncate text-[11px] text-[var(--muted-foreground)]">{roleLabels[userRole] ?? userRole}</p></div></div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center justify-end border-b border-[var(--border)] px-5 sm:px-8"><div className="flex items-center gap-2"><button type="button" onClick={newChat} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--surface)]">＋ New</button>{standalone ? <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--primary)]">Read-only</span> : <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="Close Insight Studio">×</button>}</div></header>{!loaded ? <div className="p-8 text-sm text-[var(--muted-foreground)]">Loading your conversation…</div> : <Conversation key={threadId} threadId={threadId} initialMessages={initialMessages} suggestions={prompts} onSaved={() => void loadThreads()} />}</main>
  </div>;
  return <div className={`${shell} flex min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--card)] ${fullScreen ? "md:rounded-[24px] md:shadow-[0_24px_80px_rgba(25,45,33,.12)]" : ""}`}><header className={`relative flex min-h-[50px] items-center justify-between overflow-hidden border-b border-[var(--border)] bg-[var(--card)] px-3 py-1.5 ${fullScreen ? "md:ml-[216px] md:w-[calc(100%-216px)]" : ""}`}><div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" /><div className="flex items-center gap-2"><div className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 shadow-sm"><Brand className="w-[82px]" /></div><div><p className="text-xs font-extrabold tracking-tight text-[var(--foreground)]">Insight Studio</p><p className="text-[8px] font-medium text-[var(--muted-foreground)]">{roleLabels[userRole] ?? userRole} · read-only</p></div></div><div className="flex items-center gap-0.5"><button type="button" onClick={newChat} title="New chat" className="rounded-md px-1.5 py-1 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--surface)]">＋</button><button type="button" onClick={() => router.push("/dashboard/insights")} title="Open Insight Studio page" className="rounded-md px-1.5 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)]">⛶</button><button type="button" onClick={() => setOpen(false)} title="Close" className="rounded-md px-1.5 py-1 text-base leading-none text-[var(--muted-foreground)] hover:bg-[var(--surface)]">×</button></div></header><div className="flex min-h-0 flex-1"><aside className={`${fullScreen ? "flex" : "hidden"} w-[216px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3`}><button type="button" onClick={newChat} className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d5127]">＋ New analysis</button><p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted-foreground)]">Your analyses</p><div className="min-h-0 space-y-1 overflow-y-auto">{threads.map((thread) => <button key={thread.id} type="button" onClick={() => void loadThread(thread.id)} className={`block w-full truncate rounded-lg px-2.5 py-2.5 text-left text-xs transition ${thread.id === threadId ? "border border-[var(--border)] bg-[var(--card)] font-bold text-[var(--primary)] shadow-sm" : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"}`}>{thread.title}</button>)}{threads.length === 0 && <p className="px-1 text-xs leading-5 text-[var(--muted-foreground)]">Your saved analyses will appear here.</p>}</div><div className="mt-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 text-[10px] leading-5 text-[var(--muted-foreground)]"><span className="font-bold text-[var(--primary)]">{userName}</span><br />Your access scope is always applied.</div></aside><main className="flex min-h-0 flex-1 flex-col"><div className="flex min-h-0 flex-1 flex-col">{!loaded ? <div className="p-5 text-sm text-[var(--muted-foreground)]">Loading your conversation…</div> : <Conversation key={threadId} threadId={threadId} initialMessages={initialMessages} suggestions={prompts} compact onSaved={() => void loadThreads()} />}</div></main></div></div>;
}

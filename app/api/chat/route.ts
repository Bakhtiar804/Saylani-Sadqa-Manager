import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isCurrentLoginSession } from "@/lib/admin-accounts";
import { createCopilotTools } from "@/lib/copilot-tools";
import { ensureChatThread, extractTextFromMessage, loadChatMessages, saveChatMessage } from "@/lib/copilot-db";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";
import { getChatModel, isChatModelConfigured } from "@/lib/llm";

const requestSchema = z.object({
  messages: z.array(z.unknown()).max(100),
  threadId: z.string().min(1).max(80).optional(),
});

async function getSession() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) return null;
  return session;
}

function systemPrompt(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const scope = session.role === "super_admin"
    ? "You can answer network-wide or city-specific questions."
    : session.role === "rider"
      ? "You may only answer questions about the signed-in rider's own work. Do not reveal city-wide, branch-wide, or other-rider information."
      : `You may only answer questions about the signed-in user's assigned city (${session.cityId ?? "unassigned"}) and the records visible within that scope. Never widen the scope based on a user-provided city name.`;
  return `You are Saylani Insight, a read-only analytics assistant for non-technical business users.

${scope}

Rules:
- Use the provided analytics tools for every factual database answer. Never invent names, totals, dates, or records.
- If a tool returns access_denied, explain that the information is outside the user's permissions without revealing any underlying data.
- Monthly reports are source-report aggregates. Do not describe them as individual rider collections.
- Box and staff counts are snapshots, not sums across months.
- Explain results in clear business language. Use PKR for money.
- Keep answers concise, but include a table or chart-ready breakdown when the tool provides one.
- Choose visuals by evidence: use a line chart for time trends, a bar chart for comparisons or rankings, a donut chart for composition, and a table for lists or detailed records. Do not show a chart for a single number or a simple yes/no answer.
- When a visual is returned, introduce it with a clear title and state the unit (PKR, riders, boxes, or records). Never invent a series, label, axis, or value that is not present in tool output.
- Prefer the analytics tool's structured visual data over manually formatted numbers. Explain the scope and period beside the result.
- This assistant is read-only. Never claim to have changed, created, deleted, imported, or approved anything.
- If the requested data is unavailable, say so clearly and explain what source is available instead.`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ messages: [] });
  try {
    return NextResponse.json({ messages: await loadChatMessages(session, threadId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "This conversation is unavailable." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  if (!isChatModelConfigured()) return NextResponse.json({ error: "The analytics assistant is not configured yet. Add the API key for the selected LLM_PROVIDER on the server." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid chat request." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat message format." }, { status: 400 });

  const messages = parsed.data.messages as UIMessage[];
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return NextResponse.json({ error: "Send a question first." }, { status: 400 });

  try {
    const thread = await ensureChatThread(session, parsed.data.threadId, extractTextFromMessage(lastUser).slice(0, 160));
    await saveChatMessage({ session, threadId: thread.thread_id, role: "user", content: extractTextFromMessage(lastUser) });
    const result = streamText({
      model: getChatModel(),
      system: systemPrompt(session),
      messages: await convertToModelMessages(messages),
      tools: createCopilotTools(session),
      stopWhen: stepCountIs(4),
      onFinish: async ({ text }) => {
        await saveChatMessage({ session, threadId: thread.thread_id, role: "assistant", content: text });
      },
    });
    return result.toUIMessageStreamResponse({ headers: { "X-Saylani-Thread-Id": thread.thread_id } });
  } catch (error) {
    console.error("Copilot request failed.", error);
    const detail = error instanceof Error ? error.message : "Unknown provider error.";
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "The assistant could not complete that analysis." : `Assistant provider error: ${detail}` }, { status: 503 });
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isCurrentLoginSession } from "@/lib/admin-accounts";
import { listChatThreads } from "@/lib/copilot-db";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isCurrentLoginSession(session)) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  try {
    return NextResponse.json({ threads: await listChatThreads(session) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not list copilot threads.", error);
    return NextResponse.json({ error: "Chat history is unavailable. Apply the copilot database migration first." }, { status: 503 });
  }
}

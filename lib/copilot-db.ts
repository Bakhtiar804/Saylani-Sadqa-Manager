import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabasePool } from "@/lib/db";
import type { UserSession } from "@/lib/session";

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  parts: [{ type: "text"; text: string }];
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export async function ensureAssistantProfile(session: UserSession) {
  await getDatabasePool().query(
    `INSERT INTO assistant_profiles (team_id, display_name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (team_id) DO UPDATE
     SET display_name = EXCLUDED.display_name, email = EXCLUDED.email`,
    [session.userId, session.name, session.email],
  );
}

export async function ensureChatThread(session: UserSession, requestedId?: string, title?: string) {
  await ensureAssistantProfile(session);
  const threadId = requestedId?.trim() || `thread-${randomUUID()}`;
  const result = await getDatabasePool().query<{ thread_id: string; title: string }>(
    `INSERT INTO chat_threads (thread_id, team_id, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (thread_id) DO UPDATE
     SET updated_at = CURRENT_TIMESTAMP
     WHERE chat_threads.team_id = EXCLUDED.team_id
     RETURNING thread_id, title`,
    [threadId, session.userId, title?.trim().slice(0, 160) || "New analysis"],
  );
  if (!result.rows[0]) throw new Error("This chat does not belong to the signed-in account.");
  return result.rows[0];
}

export async function listChatThreads(session: UserSession): Promise<ChatThread[]> {
  await ensureAssistantProfile(session);
  const result = await getDatabasePool().query<{
    thread_id: string; title: string; created_at: Date; updated_at: Date;
  }>(
    `SELECT thread_id, title, created_at, updated_at
     FROM chat_threads
     WHERE team_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [session.userId],
  );
  return result.rows.map((row) => ({
    id: row.thread_id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function loadChatMessages(session: UserSession, threadId: string): Promise<CopilotMessage[]> {
  const result = await getDatabasePool().query<{
    message_id: string; role: "user" | "assistant"; content: string;
  }>(
    `SELECT message_id, role, content
     FROM chat_messages
     WHERE thread_id = $1 AND team_id = $2
     ORDER BY created_at ASC
     LIMIT 100`,
    [threadId, session.userId],
  );
  return result.rows.map((row) => ({
    id: row.message_id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
  }));
}

export async function saveChatMessage(input: {
  session: UserSession;
  threadId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const content = input.content.trim();
  if (!content) return;
  await getDatabasePool().query(
    `INSERT INTO chat_messages (message_id, thread_id, team_id, role, content)
     SELECT $1, thread_id, team_id, $3, $4
     FROM chat_threads
     WHERE thread_id = $2 AND team_id = $5`,
    [
      `message-${randomUUID()}`,
      input.threadId,
      input.role,
      content.slice(0, 30_000),
      input.session.userId,
    ],
  );
  await getDatabasePool().query(
    `UPDATE chat_threads
      SET updated_at = CURRENT_TIMESTAMP,
         title = CASE WHEN title = 'New analysis' AND $2 = 'user'
           THEN LEFT($1, 160) ELSE title END
     WHERE thread_id = $3 AND team_id = $4`,
    [content, input.role, input.threadId, input.session.userId],
  );
}

export function extractTextFromMessage(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const parts = "parts" in message && Array.isArray(message.parts) ? message.parts : [];
  return parts
    .map((part) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
    .join("\n")
    .trim();
}

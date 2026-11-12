import { withApiErrors } from '@/lib/api-errors';
import { getDatabasePool } from "@/lib/db";
import { connection } from "next/server";

async function handleGET() {
  await connection();

  try {
    await getDatabasePool().query("SELECT 1");
    return Response.json(
      { status: "connected" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const details =
      error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
    console.error(`Database connectivity check failed: ${details}`);

    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = withApiErrors(handleGET);

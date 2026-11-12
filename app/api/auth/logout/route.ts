import { withApiErrors } from '@/lib/api-errors';
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { NextResponse } from "next/server";

async function handlePOST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export const POST = withApiErrors(handlePOST);

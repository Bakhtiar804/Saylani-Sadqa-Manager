import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "@/lib/session";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifyAdminSession(session)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

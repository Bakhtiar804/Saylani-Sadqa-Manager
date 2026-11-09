import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";

function isWithinArea(pathname: string, area: string) {
  return pathname === area || pathname.startsWith(`${area}/`);
}

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = verifyUserSession(session);
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (user?.role === "admin" && !isWithinArea(request.nextUrl.pathname, "/dashboard/admin")) {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }
  if (user?.role === "city_manager" && !isWithinArea(request.nextUrl.pathname, "/dashboard/manager")) {
    return NextResponse.redirect(new URL("/dashboard/manager", request.url));
  }
  if (user?.role === "rider" && !isWithinArea(request.nextUrl.pathname, "/dashboard/rider")) {
    return NextResponse.redirect(new URL("/dashboard/rider", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

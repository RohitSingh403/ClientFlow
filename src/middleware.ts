import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [
  /^\/dashboard/,
  /^\/projects/,
  /^\/clients/,
  /^\/invoices/,
  /^\/approvals/,
  /^\/activity/,
  /^\/team/,
  /^\/settings/,
  /^\/notifications/,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("cf_session")?.value;
  const needsAuth = PROTECTED.some((pattern) => pattern.test(pathname));
  if (needsAuth && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
};

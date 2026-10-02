import { jwtVerify } from "jose";
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

function secret() {
  const value = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 16) return null;
  return new TextEncoder().encode(value);
}

async function signedIn(token: string | undefined) {
  if (!token) return false;
  const key = secret();
  if (!key) return false;
  try {
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

function loginUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("cf_session")?.value;
  const needsAuth = PROTECTED.some((pattern) => pattern.test(pathname));
  const valid = await signedIn(token);

  if (token && !valid) {
    const response = needsAuth ? NextResponse.redirect(loginUrl(request, pathname)) : NextResponse.next();
    response.cookies.delete("cf_session");
    return response;
  }

  if (needsAuth && !valid) {
    return NextResponse.redirect(loginUrl(request, pathname));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
};

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isPlan, type Plan } from "@/lib/entitlements";
import { asRole, type Role } from "@/lib/permissions";

const COOKIE = "cf_session";
const WEEK = 60 * 60 * 24 * 7;

export type SessionClaims = {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: Role;
  clientId: string | null;
};

export type WorkspaceContext = SessionClaims & {
  user: { name: string; email: string };
  organization: { name: string; plan: Plan; brandColor: string | null };
};

function secret() {
  const value = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("Set SESSION_SECRET in .env before starting the app.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

async function readClaims(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = typeof payload.role === "string" ? asRole(payload.role) : null;
    if (!role || typeof payload.userId !== "string" || typeof payload.organizationId !== "string" || typeof payload.membershipId !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      membershipId: payload.membershipId,
      role,
      clientId: typeof payload.clientId === "string" ? payload.clientId : null,
    };
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getContext(): Promise<WorkspaceContext | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const claims = await readClaims(token);
  if (!claims) return null;

  const membership = await db.membership.findFirst({
    where: { id: claims.membershipId, userId: claims.userId },
    include: { user: true, organization: true },
  });
  if (!membership) return null;
  const role = asRole(membership.role);
  if (!role || !isPlan(membership.organization.plan)) return null;

  return {
    userId: membership.userId,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    role,
    clientId: membership.clientId,
    user: { name: membership.user.name, email: membership.user.email },
    organization: {
      name: membership.organization.name,
      plan: membership.organization.plan,
      brandColor: membership.organization.brandColor,
    },
  };
}

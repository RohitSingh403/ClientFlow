"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readString, safeNextPath } from "@/lib/form";
import { asRole } from "@/lib/permissions";
import { clearSessionCookie, setSessionCookie, signSession } from "@/lib/session";
import type { ActionState } from "@/server/guard";
import { refreshWorkspace } from "@/server/refresh";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 20; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await db.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function enterMembership(membership: {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  clientId: string | null;
}) {
  const role = asRole(membership.role);
  if (!role) return { error: "This membership is not valid." };
  const token = await signSession({
    userId: membership.userId,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    role,
    clientId: membership.clientId,
  });
  await setSessionCookie(token);
  return null;
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = readString(formData, "name");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const organizationName = readString(formData, "organization");

  if (name.length < 2) return { error: "Enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };
  if (organizationName.length < 2) return { error: "Name the organization." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists. Sign in instead." };

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueSlug(organizationName);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          organization: { create: { name: organizationName, slug, plan: "FREE" } },
        },
      },
    },
    include: { memberships: true },
  });
  const membership = user.memberships[0];
  const failure = await enterMembership(membership);
  if (failure) return failure;
  redirect("/dashboard");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const nextPath = safeNextPath(formData.get("next"));

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !matches || user.memberships.length === 0) {
    return { error: "Email or password does not match." };
  }
  const failure = await enterMembership(user.memberships[0]);
  if (failure) return failure;
  redirect(nextPath);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/");
}

export async function switchOrganization(formData: FormData) {
  const { getContext } = await import("@/lib/session");
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  const membershipId = readString(formData, "membershipId");
  const membership = await db.membership.findFirst({
    where: { id: membershipId, userId: ctx.userId },
  });
  if (!membership) return;
  await enterMembership(membership);
  refreshWorkspace();
  redirect("/dashboard");
}

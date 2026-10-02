export const ROLES = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

const STAFF = [
  "project:view",
  "project:create",
  "project:update",
  "project:delete",
  "task:create",
  "task:update",
  "client:view",
  "client:create",
  "deliverable:view",
  "deliverable:create",
  "deliverable:comment",
  "invoice:view",
  "invoice:create",
  "invoice:send",
  "invoice:collect",
  "invoice:cancel",
  "portal:grant",
  "activity:view",
  "analytics:view",
  "settings:view",
] as const;

const ADMIN = [
  ...STAFF,
  "member:view",
  "member:invite",
  "member:remove",
  "jobs:run",
] as const;

export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  OWNER: ["*"],
  ADMIN,
  MANAGER: STAFF,
  EMPLOYEE: [
    "project:view",
    "task:update",
    "deliverable:view",
    "deliverable:create",
    "deliverable:comment",
    "activity:view",
  ],
  CLIENT: [
    "project:view",
    "deliverable:view",
    "deliverable:approve",
    "deliverable:comment",
    "invoice:view",
  ],
};

export function asRole(value: string): Role | null {
  return ROLES.includes(value as Role) ? (value as Role) : null;
}

export function can(role: string, permission: string) {
  // Approval is the client's action. The owner wildcard does not cover it.
  if (permission === "deliverable:approve") return role === "CLIENT";
  const list = ROLE_PERMISSIONS[role as Role];
  if (!list) return false;
  return list.includes("*") || list.includes(permission);
}

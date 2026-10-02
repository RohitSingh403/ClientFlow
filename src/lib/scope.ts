export function projectWhere(ctx: {
  organizationId: string;
  role: string;
  clientId: string | null;
  userId: string;
}) {
  if (ctx.role === "CLIENT") {
    return { organizationId: ctx.organizationId, clientId: ctx.clientId ?? "__none__" };
  }
  if (ctx.role === "EMPLOYEE") {
    return {
      organizationId: ctx.organizationId,
      members: { some: { userId: ctx.userId } },
    };
  }
  return { organizationId: ctx.organizationId };
}

import { db } from "../src/lib/db";
import { projectWhere } from "../src/lib/scope";

async function main() {
  const rohit = await db.user.findUnique({
    where: { email: "rohit@northline.studio" },
    include: { memberships: true },
  });
  const anika = await db.user.findUnique({
    where: { email: "anika@harbor.co" },
    include: { memberships: true },
  });
  const priya = await db.membership.findFirst({
    where: { user: { email: "priya@abcpvt.com" } },
  });
  if (!rohit || !anika || !priya?.clientId) {
    throw new Error("Seed the database before running this check.");
  }

  const northlineId = rohit.memberships[0]?.organizationId;
  const harborId = anika.memberships[0]?.organizationId;
  if (!northlineId || !harborId || northlineId === harborId) {
    throw new Error("The two organizations were not kept apart.");
  }

  const harborProjects = await db.project.findMany({ where: { organizationId: harborId } });
  if (harborProjects.length !== 2) throw new Error("Harbor should be sitting on the free project limit.");

  const leaked = await db.project.findFirst({
    where: { id: harborProjects[0].id, organizationId: northlineId },
  });
  if (leaked) throw new Error("A Northline query returned a Harbor project.");

  const foreignInvoice = await db.invoice.findFirst({
    where: { organizationId: northlineId, number: "INV-100" },
  });
  if (foreignInvoice) throw new Error("Harbor invoice INV-100 was visible inside Northline.");

  const visibleToClient = await db.project.findMany({
    where: projectWhere({ organizationId: northlineId, role: "CLIENT", clientId: priya.clientId }),
  });
  if (visibleToClient.length === 0) throw new Error("The client portal returned no projects.");
  if (visibleToClient.some((project) => project.clientId !== priya.clientId)) {
    throw new Error("The client portal included another client's project.");
  }

  const kite = await db.project.findFirst({ where: { organizationId: northlineId, name: "Campaign landing page" } });
  if (visibleToClient.some((project) => project.id === kite?.id)) {
    throw new Error("ABC's client can see Kite & Co's project.");
  }

  console.log("Tenant isolation holds.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

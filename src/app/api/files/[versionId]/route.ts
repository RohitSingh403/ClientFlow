import { getContext } from "@/lib/session";
import { projectWhere } from "@/lib/scope";
import { db } from "@/lib/db";
import { readObject } from "@/server/storage";

export async function GET(_request: Request, context: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await context.params;
  const session = await getContext();
  if (!session) return new Response("Sign in required.", { status: 401 });

  const version = await db.deliverableVersion.findFirst({
    where: { id: versionId, deliverable: { project: projectWhere(session) } },
  });
  if (!version) return new Response("Not found.", { status: 404 });

  const bytes = await readObject(version.storageKey);
  if (!bytes) return new Response("File missing.", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": version.contentType,
      "Content-Disposition": `inline; filename="${version.fileName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

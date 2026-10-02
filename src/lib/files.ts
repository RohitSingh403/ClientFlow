const KINDS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function fileKind(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = KINDS[ext];
  if (!contentType) return null;
  return { ext: ext === "jpeg" ? ".jpg" : `.${ext}`, contentType };
}

export function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 80);
  return cleaned || "file";
}

export function isPreviewable(contentType: string) {
  return contentType.startsWith("image/");
}

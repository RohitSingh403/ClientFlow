import fs from "fs/promises";
import path from "path";

const root = path.join(process.cwd(), "storage");

function resolveKey(storageKey: string) {
  if (!storageKey || storageKey.includes("..") || path.isAbsolute(storageKey)) return null;
  const full = path.resolve(root, storageKey);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

export async function saveObject(storageKey: string, bytes: Buffer) {
  const full = resolveKey(storageKey);
  if (!full) throw new Error("Invalid storage path.");
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
}

export async function readObject(storageKey: string) {
  const full = resolveKey(storageKey);
  if (!full) return null;
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

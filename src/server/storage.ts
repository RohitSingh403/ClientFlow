import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

const root = path.join(process.cwd(), "storage");

function resolveKey(storageKey: string) {
  if (!storageKey || storageKey.includes("..") || path.isAbsolute(storageKey)) return null;
  const full = path.resolve(root, storageKey);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function remoteConfig() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT;
  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) return null;
  return { bucket, accessKeyId, secretAccessKey, endpoint };
}

let remoteClient: S3Client | null = null;

function remote() {
  const config = remoteConfig();
  if (!config) return null;
  if (!remoteClient) {
    remoteClient = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return { client: remoteClient, bucket: config.bucket };
}

export async function saveObject(storageKey: string, bytes: Buffer) {
  const store = remote();
  if (store) {
    await store.client.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: storageKey,
        Body: bytes,
      }),
    );
    return;
  }

  const full = resolveKey(storageKey);
  if (!full) throw new Error("Invalid storage path.");
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
}

export async function readObject(storageKey: string) {
  if (!storageKey || storageKey.includes("..") || path.isAbsolute(storageKey)) return null;
  const store = remote();
  if (store) {
    try {
      const result = await store.client.send(
        new GetObjectCommand({
          Bucket: store.bucket,
          Key: storageKey,
        }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch {
      return null;
    }
  }

  const full = resolveKey(storageKey);
  if (!full) return null;
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

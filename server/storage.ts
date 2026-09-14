import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string) { return relKey.replace(/^\/+/, ""); }
function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
function useS3() { return ENV.storageMode === "s3" && !!ENV.awsAccessKeyId && !!ENV.awsSecretAccessKey && !!ENV.awsRegion && !!ENV.awsBucket; }
function s3Client() { return new S3Client({ region: ENV.awsRegion, credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey } }); }
function localPath(key: string) { return path.resolve(ENV.localStorageDir, key); }

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  if (useS3()) {
    await s3Client().send(new PutObjectCommand({ Bucket: ENV.awsBucket, Key: key, Body: bytes, ContentType: contentType }));
  } else {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string) { const key = normalizeKey(relKey); return { key, url: `/storage/${key}` }; }

export async function storageGetSignedUrl(relKey: string) {
  const key = normalizeKey(relKey);
  if (useS3()) return getSignedUrl(s3Client(), new GetObjectCommand({ Bucket: ENV.awsBucket, Key: key }), { expiresIn: 3600 });
  return `/storage/${key}`;
}

export async function readLocalStorage(key: string) { return readFile(localPath(normalizeKey(key))); }
export function isS3Storage() { return useS3(); }

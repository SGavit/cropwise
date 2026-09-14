import type { Express } from "express";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./env";
import { isS3Storage, readLocalStorage } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const key = String(req.params[0] || "").replace(/^\/+/, "");
    if (!key) { res.status(404).end(); return; }
    try {
      if (isS3Storage()) {
        const client = new S3Client({ region: ENV.awsRegion, credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey } });
        const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: ENV.awsBucket, Key: key }), { expiresIn: 900 });
        res.redirect(302, url);
        return;
      }
      const file = await readLocalStorage(key);
      const ext = key.toLowerCase().split(".").pop();
      const contentTypes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", json: "application/json" };
      if (ext && contentTypes[ext]) res.type(contentTypes[ext]);
      res.send(file);
    } catch { res.status(404).json({ error: "File not found" }); }
  });
}

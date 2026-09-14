import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { allowAnonymousQuickScan, analyzeCropPhotoBytesWithoutStorage, CropPhotoValidationError, isSupportedCropPhotoMimeType } from "../cropAnalysis";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.post(
    "/api/quick-scan",
    express.raw({ type: "application/octet-stream", limit: "512kb" }),
    async (req, res) => {
      const suppliedMimeType = req.headers["x-cropwise-image-type"];
      const mimeType = typeof suppliedMimeType === "string" ? suppliedMimeType.split(";", 1)[0] : "";
      if (!isSupportedCropPhotoMimeType(mimeType) || !Buffer.isBuffer(req.body)) {
        res.status(415).json({ error: "Please upload a JPEG, PNG, or WebP crop photo." });
        return;
      }
      if (!allowAnonymousQuickScan(req.ip || "anonymous")) {
        res.status(429).json({ error: "Quick scan limit reached. Please try again in about an hour." });
        return;
      }
      try {
        const suppliedLanguage = req.headers["x-cropwise-language"];
        const language = suppliedLanguage === "hi" || suppliedLanguage === "mr" ? suppliedLanguage : "en";
        const result = await analyzeCropPhotoBytesWithoutStorage(req.body, mimeType, language);
        res.status(200).json(result);
      } catch (error) {
        if (error instanceof CropPhotoValidationError) {
          res.status(400).json({ error: error.message });
          return;
        }
        console.error("[Quick scan] Failed to analyse anonymous crop photo", error);
        res.status(500).json({ error: "CropWise could not complete that quick scan. Please try another clear crop photo." });
      }
    },
  );
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

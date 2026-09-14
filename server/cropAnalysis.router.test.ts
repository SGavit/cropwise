import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("cropAnalysis.analyze", () => {
  it("requires a signed-in user before accepting an image", async () => {
    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    await expect(caller.cropAnalysis.analyze({
      dataUrl: "data:image/jpeg;base64,Y3JvcC1waG90bw==",
      fileName: "crop.jpg",
      mimeType: "image/jpeg",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

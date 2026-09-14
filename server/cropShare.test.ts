import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("cropShare", () => {
  it("rejects malformed public share slugs", async () => {
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cropShare.get({ slug: "bad" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

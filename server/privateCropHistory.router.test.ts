import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createPrivateCropScan } = vi.hoisted(() => ({
  createPrivateCropScan: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createPrivateCropScan };
});

vi.mock("./cropAnalysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cropAnalysis")>();
  return {
    ...actual,
    analyzeCropPhoto: vi.fn().mockResolvedValue({
      cropName: "Maize",
      localName: "Makka",
      scientificName: "Zea mays",
      identificationConfidence: "high",
      healthStatus: "healthy",
      overview: "The leaf appears healthy in this image.",
      visibleObservations: ["Even green leaf colour"],
      likelyIssue: "No urgent visible concern in this image.",
      cropStage: "Vegetative",
      nextSteps: ["Continue routine field checks."],
      needsExpertReview: false,
      recheckPrompt: "Take another photo if leaves change.",
      imageUrl: "https://storage.example/private-maize.jpg",
      scanMode: "private",
      privacyNotice: "Your private scan is saved to your signed-in CropWise account.",
      disclaimer: "Photo checks are guidance, not a confirmed diagnosis.",
    }),
  };
});

import { appRouter } from "./routers";

describe("cropAnalysis.analyze private history", () => {
  it("writes a completed signed-in scan to the current farmer’s private history", async () => {
    const ctx = {
      user: {
        id: 27,
        openId: "private-scan-farmer",
        name: "Private Scan Farmer",
        email: null,
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    await caller.cropAnalysis.analyze({
      dataUrl: "data:image/jpeg;base64,Y3JvcC1waG90bw==",
      fileName: "maize.jpg",
      mimeType: "image/jpeg",
    });

    expect(createPrivateCropScan).toHaveBeenCalledWith(expect.objectContaining({
      userId: 27,
      cropName: "Maize",
      localName: "Makka",
      healthStatus: "healthy",
      imageUrl: "https://storage.example/private-maize.jpg",
    }));
  });
});

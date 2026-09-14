import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getFarmProfile: vi.fn().mockResolvedValue(null),
    saveFarmProfile: vi.fn().mockImplementation(async (profile) => profile),
    updateUserDisplayName: vi.fn().mockImplementation(async (userId, name) => ({ id: userId, name })),
    updateUserAvatar: vi.fn().mockImplementation(async (userId, avatarKey) => ({ id: userId, avatarKey })),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "cropwise/users/9/avatar_abc.png", url: "/manus-storage/cropwise/users/9/avatar_abc.png" }),
}));

import { appRouter } from "./routers";
import { saveFarmProfile, updateUserAvatar, updateUserDisplayName } from "./db";
import { storagePut } from "./storage";

describe("farmProfile.get", () => {
  it("returns null instead of undefined when a signed-in farmer has no saved profile", async () => {
    const ctx = {
      user: {
        id: 1,
        openId: "profileless-farmer",
        name: "Profileless Farmer",
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
    await expect(caller.farmProfile.get()).resolves.toBeNull();
  });
});

describe("auth.updateDisplayName", () => {
  it("updates only the signed-in user’s display name", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.updateDisplayName({ name: "Asha Patil" })).resolves.toMatchObject({ id: 9, name: "Asha Patil" });
    expect(updateUserDisplayName).toHaveBeenCalledWith(9, "Asha Patil");
  });

  it("uploads a supported avatar and returns an account-owned storage URL", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.uploadAvatar({ dataUrl: "data:image/png;base64,AA==" })).resolves.toMatchObject({ id: 9, avatarUrl: "/manus-storage/cropwise/users/9/avatar_abc.png" });
    expect(storagePut).toHaveBeenCalledWith("cropwise/users/9/avatar", expect.any(Buffer), "image/png");
    expect(updateUserAvatar).toHaveBeenCalledWith(9, "cropwise/users/9/avatar_abc.png");
  });

  it("rejects unsupported avatar data before storage access", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.uploadAvatar({ dataUrl: "data:image/gif;base64,AA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects oversized avatar payloads before storage access", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const storageCallsBefore = vi.mocked(storagePut).mock.calls.length;
    const oversizedDataUrl = `data:image/jpeg;base64,${"A".repeat(2_900_001)}`;
    await expect(caller.auth.uploadAvatar({ dataUrl: oversizedDataUrl })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(vi.mocked(storagePut).mock.calls).toHaveLength(storageCallsBefore);
  });

  it("removes the signed-in user’s avatar and does not upload a replacement", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const storageCallsBefore = vi.mocked(storagePut).mock.calls.length;
    await expect(caller.auth.removeAvatar()).resolves.toMatchObject({ id: 9, avatarUrl: null });
    expect(updateUserAvatar).toHaveBeenCalledWith(9, null);
    expect(vi.mocked(storagePut).mock.calls).toHaveLength(storageCallsBefore);
  });

  it("rejects names that are too short", async () => {
    const ctx = {
      user: { id: 9, openId: "name-farmer", name: "Old Name", email: "farmer@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.updateDisplayName({ name: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("farmProfile.save", () => {
  it("forwards normalized crop-area allocation data for the signed-in farmer", async () => {
    const ctx = {
      user: {
        id: 7,
        openId: "allocation-farmer",
        name: "Allocation Farmer",
        email: null,
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const allocation = JSON.stringify({ totalAcres: 8, allocations: { Maize: 60, Wheat: 40 } });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.farmProfile.save({ village: "Bhatodi", district: "Beed", state: "Maharashtra", cropPreferences: ["Maize", "Wheat"], cropAreaAllocations: allocation, language: "en" })).resolves.toMatchObject({ cropAreaAllocations: allocation });
    expect(saveFarmProfile).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, cropAreaAllocations: allocation }));
  });
});

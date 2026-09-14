import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createCropCalendarReminder, listCropAlertThresholds, listCropCalendarReminders, saveCropAlertThreshold, setCropCalendarReminderStatus } = vi.hoisted(() => ({
  createCropCalendarReminder: vi.fn().mockResolvedValue([]),
  listCropAlertThresholds: vi.fn().mockResolvedValue([]),
  listCropCalendarReminders: vi.fn().mockResolvedValue([]),
  saveCropAlertThreshold: vi.fn().mockResolvedValue([]),
  setCropCalendarReminderStatus: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  createCropCalendarReminder,
  listCropAlertThresholds,
  listCropCalendarReminders,
  saveCropAlertThreshold,
  setCropCalendarReminderStatus,
}));

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 44, openId: "planning-farmer", name: "Planning Farmer", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("private crop planning procedures", () => {
  it("creates and completes a calendar reminder for the authenticated farmer only", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const dueAt = new Date("2026-08-31T09:00:00.000Z");

    await caller.cropCalendar.create({ cropName: "Maize", title: "Inspect drainage", details: "Check after rain", dueAt });
    await caller.cropCalendar.setStatus({ id: 7, status: "completed" });

    expect(createCropCalendarReminder).toHaveBeenCalledWith(expect.objectContaining({ userId: 44, cropName: "Maize", title: "Inspect drainage", dueAt }));
    expect(setCropCalendarReminderStatus).toHaveBeenCalledWith({ userId: 44, id: 7, status: "completed" });
  });

  it("saves crop-specific Wealth Watch guardrails under the authenticated farmer", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.cropAlertThresholds.save({ cropName: "Groundnut", priceFloor: 6400, rainChance: 68, soilMoistureMinimum: 38 });

    expect(saveCropAlertThreshold).toHaveBeenCalledWith({ userId: 44, cropName: "Groundnut", priceFloor: 6400, rainChance: 68, soilMoistureMinimum: 38 });
  });

  it("rejects invalid private alert threshold percentages before persistence", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.cropAlertThresholds.save({ cropName: "Soybean", priceFloor: 4800, rainChance: 101, soilMoistureMinimum: 35 })).rejects.toThrow();
    expect(saveCropAlertThreshold).toHaveBeenCalledTimes(1);
  });
});

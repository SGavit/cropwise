import { describe, expect, it } from "vitest";
import { getProfileCompletion } from "./profileCompletion";

describe("getProfileCompletion", () => {
  it("reports a complete authenticated farm profile", () => {
    const result = getProfileCompletion({
      name: "Asha Patil",
      email: "asha@example.com",
      avatarUrl: "/storage/avatar.png",
      farmProfile: { village: "Bhatodi", district: "Beed", state: "Maharashtra", cropPreferences: ["Maize"] },
    });
    expect(result.percent).toBe(100);
    expect(result.completed).toBe(5);
    expect(result.items.every((item) => item.complete)).toBe(true);
  });

  it("identifies an absent avatar as the actionable missing detail", () => {
    const result = getProfileCompletion({
      name: "Asha Patil",
      email: "asha@example.com",
      farmProfile: { village: "Bhatodi", district: "Beed", state: "Maharashtra", cropPreferences: '["Maize"]' },
    });
    expect(result.percent).toBe(80);
    expect(result.items.find((item) => item.id === "avatar")?.complete).toBe(false);
  });

  it("does not count malformed or empty crop preferences", () => {
    const result = getProfileCompletion({ name: "Asha Patil", email: "asha@example.com", avatarUrl: "avatar", farmProfile: { village: "Bhatodi", district: "Beed", state: "Maharashtra", cropPreferences: "not-json" } });
    expect(result.items.find((item) => item.id === "crops")?.complete).toBe(false);
    expect(result.percent).toBe(80);
  });
});

import { describe, expect, it } from "vitest";
import { allocationRows, currentCropPlanSeason, equalCropAllocation, normalizeCropAllocation, seasonalCropSuggestions, validateCropAllocation } from "./cropPlan";

describe("crop plan helpers", () => {
  it("distributes a full farm area evenly and keeps the total at 100%", () => {
    const allocation = equalCropAllocation(["Maize", "Groundnut", "Soybean"]);
    expect(allocation).toEqual({ Maize: 33.33, Groundnut: 33.33, Soybean: 33.34 });
    expect(Object.values(allocation).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("validates positive crop areas and an exact full-farm total", () => {
    expect(validateCropAllocation(["Maize", "Groundnut"], { Maize: 60, Groundnut: 40 }, 4.5)).toEqual({ valid: true, totalPercent: 100 });
    expect(validateCropAllocation(["Maize", "Groundnut"], { Maize: 60, Groundnut: 35 }, 4.5).reason).toBe("total");
    expect(validateCropAllocation(["Maize", "Groundnut"], { Maize: 100, Groundnut: 0 }, 4.5).reason).toBe("crop-area");
    expect(validateCropAllocation(["Maize"], { Maize: 100 }, 0).reason).toBe("farm-area");
  });

  it("normalizes a saved allocation and falls back safely for invalid data", () => {
    expect(normalizeCropAllocation(["Maize", "Wheat"], JSON.stringify({ totalAcres: 12, allocations: { Maize: 25, Wheat: 75 } }))).toEqual({ totalAcres: 12, percentages: { Maize: 25, Wheat: 75 } });
    expect(normalizeCropAllocation(["Maize", "Wheat"], "not-json", 6).percentages).toEqual({ Maize: 50, Wheat: 50 });
  });

  it("converts selected crop percentages to acre rows", () => {
    expect(allocationRows(["Maize", "Wheat"], { Maize: 60, Wheat: 40 }, 5)).toEqual([
      { cropId: "Maize", percent: 60, acres: 3 },
      { cropId: "Wheat", percent: 40, acres: 2 },
    ]);
  });

  it("returns season-aware combinations for Kharif and Rabi", () => {
    expect(seasonalCropSuggestions("Kharif")).toHaveLength(3);
    expect(seasonalCropSuggestions("Kharif")[0].crops).toContain("Soybean");
    expect(seasonalCropSuggestions("Rabi")).toHaveLength(3);
    expect(seasonalCropSuggestions("Rabi")[0].crops).toEqual(["Wheat", "Chickpea"]);
    expect(currentCropPlanSeason(new Date("2026-07-15T00:00:00Z"))).toBe("Kharif");
    expect(currentCropPlanSeason(new Date("2026-12-15T00:00:00Z"))).toBe("Rabi");
  });
});

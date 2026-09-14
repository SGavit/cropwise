import { describe, expect, it } from "vitest";
import { toggleCropSelection } from "./cropSelection";

describe("crop shortlist selection", () => {
  it("adds a crop until the shortlist contains three items", () => {
    expect(toggleCropSelection(["Maize"], "Rice")).toEqual({ next: ["Maize", "Rice"] });
    expect(toggleCropSelection(["Maize", "Rice", "Wheat"], "Cotton")).toEqual({
      next: ["Maize", "Rice", "Wheat"],
      reason: "limit",
    });
  });

  it("removes a selected crop while keeping the order of the remaining shortlist", () => {
    expect(toggleCropSelection(["Maize", "Rice", "Wheat"], "Rice")).toEqual({ next: ["Maize", "Wheat"] });
  });

  it("does not allow an empty shortlist", () => {
    expect(toggleCropSelection(["Maize"], "Maize")).toEqual({ next: ["Maize"], reason: "keep-one" });
  });
});

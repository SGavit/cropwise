import { describe, expect, it } from "vitest";
import { formatFarmLocation, parseManualFarmLocation } from "./farmLocation";

describe("parseManualFarmLocation", () => {
  it("normalizes manual village, district, and state entries", () => {
    expect(parseManualFarmLocation({ village: "  Bhatodi  ", district: "  Beed ", state: " Maharashtra " })).toEqual({
      village: "Bhatodi",
      district: "Beed",
      state: "Maharashtra",
    });
  });

  it("accepts local-language location names", () => {
    expect(parseManualFarmLocation({ village: "भाटोडी", district: "बीड", state: "महाराष्ट्र" })).toEqual({
      village: "भाटोडी",
      district: "बीड",
      state: "महाराष्ट्र",
    });
  });

  it("requires each manual location field", () => {
    expect(() => parseManualFarmLocation({ village: "Bhatodi", district: "", state: "Maharashtra" })).toThrow("District");
  });

  it("formats a complete farm location for the dashboard", () => {
    expect(formatFarmLocation({ village: "Bhatodi", district: "Beed", state: "Maharashtra" })).toBe("Bhatodi, Beed, Maharashtra");
  });
});

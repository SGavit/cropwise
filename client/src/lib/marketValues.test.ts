import { describe, expect, it } from "vitest";
import { parseMarketValues } from "./marketValues";

describe("parseMarketValues", () => {
  it("accepts formatted positive prices and downward trends", () => {
    expect(parseMarketValues("2,380", "-75")).toEqual({ price: 2380, trend: -75 });
  });

  it("rounds fractional values for the dashboard", () => {
    expect(parseMarketValues("2150.6", "180.4")).toEqual({ price: 2151, trend: 180 });
  });

  it("validates independent values for each supported crop type", () => {
    const valuesByCrop = [
      ["Maize", "2,150", "180"],
      ["Groundnut", "3,200", "120"],
      ["Soybean", "4,100", "90"],
    ] as const;

    expect(valuesByCrop.map(([crop, price, trend]) => [crop, parseMarketValues(price, trend)])).toEqual([
      ["Maize", { price: 2150, trend: 180 }],
      ["Groundnut", { price: 3200, trend: 120 }],
      ["Soybean", { price: 4100, trend: 90 }],
    ]);
  });

  it("rejects empty, non-positive, and non-numeric inputs", () => {
    expect(() => parseMarketValues("", "80")).toThrow("positive price");
    expect(() => parseMarketValues("0", "80")).toThrow("positive price");
    expect(() => parseMarketValues("2150", "falling")).toThrow("valid 30-day change");
  });
});

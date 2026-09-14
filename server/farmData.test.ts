import { afterEach, describe, expect, it, vi } from "vitest";
import { getDistrictMandiPrice, getDistrictWeather, searchWeatherLocations, supportedCropSchema, weatherLabelForCode } from "./farmData";

describe("district farm data", () => {
  const location = { village: "Bhatodi", district: "Beed", state: "Maharashtra" };
  const originalKey = process.env.CEDA_AGMARKNET_API_KEY;

  afterEach(() => {
    process.env.CEDA_AGMARKNET_API_KEY = originalKey;
  });

  it("normalizes a district weather lookup into farmer-facing field conditions", async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input.includes("geocoding-api")) {
        return new Response(JSON.stringify({ results: [{ latitude: 18.99, longitude: 75.76, name: "Beed", admin1: "Maharashtra" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({
        current: { temperature_2m: 29.4, apparent_temperature: 32.2, relative_humidity_2m: 68, weather_code: 2, precipitation: 0, wind_speed_10m: 11.3 },
        daily: { time: ["2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24", "2026-08-25"], weather_code: [2, 61, 3, 80, 0], temperature_2m_max: [31.3, 29.8, 30.1, 28.4, 32.2], temperature_2m_min: [23.4, 22.1, 21.8, 22.4, 23.1], precipitation_probability_max: [40, 70, 30, 75, 10] },
      }), { status: 200 });
    });

    const weather = await getDistrictWeather(location, fetcher as typeof fetch);
    expect(weather.status).toBe("available");
    if (weather.status !== "available") throw new Error("Expected available weather conditions");
    expect(weather.locationLabel).toBe("Beed, Maharashtra");
    expect(weather.temperature).toBe(29);
    expect(weather.condition).toBe("Partly cloudy");
    expect(weather.forecast[1]).toMatchObject({ condition: "Light rain", rainChance: 70 });
    expect(weather.forecast).toHaveLength(5);
    expect(weather.forecast[4]).toMatchObject({ date: "2026-08-25", condition: "Clear sky", high: 32, low: 23 });
  });

  it("returns a typed unavailable weather state when the provider times out", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("Connect Timeout Error");
    });

    const weather = await getDistrictWeather(location, fetcher as typeof fetch);
    expect(weather).toMatchObject({
      status: "unavailable",
      source: "Open-Meteo",
      locationLabel: "Beed, Maharashtra",
      message: "Weather is temporarily unavailable. Tap Refresh weather to try again.",
    });
  });

  it("returns selectable Indian forecast locations from a manual search", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      results: [
        { name: "Bhatodi", admin2: "Beed", admin1: "Maharashtra", country_code: "IN" },
        { name: "Bhatodi", admin2: "Beed", admin1: "Maharashtra", country_code: "IN" },
        { name: "Bhatodi", admin2: "Beed", admin1: "Maharashtra", country_code: "US" },
      ],
    }), { status: 200 }));

    await expect(searchWeatherLocations({ query: "Bhatodi" }, fetcher as typeof fetch)).resolves.toEqual({
      status: "available",
      source: "Open-Meteo",
      results: [{ village: "Bhatodi", district: "Beed", state: "Maharashtra" }],
    });
  });

  it("returns a safe unavailable location-search response when the provider fails", async () => {
    const fetcher = vi.fn(async () => { throw new Error("Connect Timeout Error"); });
    await expect(searchWeatherLocations({ query: "Bhatodi" }, fetcher as typeof fetch)).resolves.toEqual({
      status: "unavailable",
      source: "Open-Meteo",
      results: [],
    });
  });

  it("does not fabricate mandi prices when the provider key is unavailable", async () => {
    process.env.CEDA_AGMARKNET_API_KEY = "";
    const mandi = await getDistrictMandiPrice(location, "Maize");
    expect(mandi).toMatchObject({ status: "unavailable", source: "CEDA Agmarknet" });
  });

  it("accepts every crop exposed by the Crop Plan catalog", () => {
    expect(["Maize", "Groundnut", "Soybean", "Wheat", "Cotton", "Chickpea", "Rice"].map((crop) => supportedCropSchema.parse(crop))).toHaveLength(7);
  });

  it("maps documented weather codes to readable field conditions", () => {
    expect(weatherLabelForCode(95)).toBe("Thunderstorm");
    expect(weatherLabelForCode(999)).toBe("Field conditions updating");
  });
});

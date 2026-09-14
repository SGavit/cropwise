import { z } from "zod";

export const districtLocationSchema = z.object({
  village: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
});
export const weatherLocationSearchSchema = z.object({
  query: z.string().trim().min(2).max(80),
});

export const supportedCropSchema = z.enum(["Maize", "Groundnut", "Soybean", "Wheat", "Cotton", "Chickpea", "Rice"]);
export const supportedLanguageSchema = z.enum(["en", "hi", "mr"]);

type FetchLike = typeof fetch;
type MandiStatus =
  | { status: "available"; source: "CEDA Agmarknet"; cropName: string; modalPrice: number; minPrice: number; maxPrice: number; observedOn: string; refreshedAt: string }
  | { status: "unavailable"; source: "CEDA Agmarknet"; message: string; refreshedAt: string };

type WeatherStatus =
  | {
      status: "available";
      source: "Open-Meteo";
      locationLabel: string;
      temperature: number;
      apparentTemperature: number;
      humidity: number;
      precipitation: number;
      windSpeed: number;
      conditionCode: number;
      condition: string;
      refreshedAt: string;
      forecast: Array<{ date: string; conditionCode: number; condition: string; high: number; low: number; rainChance: number }>;
    }
  | { status: "unavailable"; source: "Open-Meteo"; locationLabel: string; message: string; refreshedAt: string };

type WeatherLocationSearchStatus =
  | { status: "available"; source: "Open-Meteo"; results: Array<z.infer<typeof districtLocationSchema>> }
  | { status: "unavailable"; source: "Open-Meteo"; results: [] };

const weatherCodeLabels: Record<number, string> = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Foggy", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Heavy freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers",
  81: "Heavy showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
};

const commodityAliases: Record<z.infer<typeof supportedCropSchema>, string[]> = {
  Maize: ["maize", "corn"],
  Groundnut: ["groundnut", "peanut"],
  Soybean: ["soybean", "soya bean"],
  Wheat: ["wheat"],
  Cotton: ["cotton", "kapas"],
  Chickpea: ["chickpea", "gram", "chana", "bengal gram"],
  Rice: ["rice", "paddy", "dhan"],
};

function fetchWithTimeout(fetcher: FetchLike, input: RequestInfo | URL, init?: RequestInit, timeoutMs = 15_000) {
  return fetcher(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function weatherLabelForCode(code: number) {
  return weatherCodeLabels[code] ?? "Field conditions updating";
}

export async function searchWeatherLocations(
  input: z.infer<typeof weatherLocationSearchSchema>,
  fetcher: FetchLike = fetch,
): Promise<WeatherLocationSearchStatus> {
  try {
    const query = new URLSearchParams({ name: `${input.query}, India`, count: "6", language: "en", format: "json" });
    const response = await fetchWithTimeout(fetcher, `https://geocoding-api.open-meteo.com/v1/search?${query}`);
    if (!response.ok) throw new Error("Weather location search is unavailable.");

    const payload = await response.json() as {
      results?: Array<{ name?: string; admin2?: string; admin1?: string; country_code?: string }>;
    };
    const seen = new Set<string>();
    const results = (payload.results ?? [])
      .filter((item) => !item.country_code || item.country_code === "IN")
      .map((item) => ({
        village: item.name?.trim() || "",
        district: item.admin2?.trim() || item.name?.trim() || "",
        state: item.admin1?.trim() || "",
      }))
      .filter((item) => item.village.length >= 2 && item.district.length >= 2 && item.state.length >= 2)
      .filter((item) => {
        const key = `${item.village}|${item.district}|${item.state}`.toLocaleLowerCase("en-IN");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return { status: "available", source: "Open-Meteo", results };
  } catch (error) {
    console.warn("[Weather] location search failed", error);
    return { status: "unavailable", source: "Open-Meteo", results: [] };
  }
}

export async function getDistrictWeather(location: z.infer<typeof districtLocationSchema>, fetcher: FetchLike = fetch): Promise<WeatherStatus> {
  const locationLabel = `${location.district}, ${location.state}`;
  try {
    const locationQuery = new URLSearchParams({ name: `${location.district}, ${location.state}, India`, count: "1", language: "en", format: "json" });
    const geocodeResponse = await fetchWithTimeout(fetcher, `https://geocoding-api.open-meteo.com/v1/search?${locationQuery}`);
    if (!geocodeResponse.ok) throw new Error("Weather location lookup is unavailable.");

    const geocode = await geocodeResponse.json() as { results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string }> };
    const match = geocode.results?.[0];
    if (!match) throw new Error("Weather is not available for this district yet.");

    const query = new URLSearchParams({
      latitude: String(match.latitude),
      longitude: String(match.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "5",
    });
    const weatherResponse = await fetchWithTimeout(fetcher, `https://api.open-meteo.com/v1/forecast?${query}`);
    if (!weatherResponse.ok) throw new Error("Weather conditions are temporarily unavailable.");

    const weather = await weatherResponse.json() as {
      current?: Record<string, unknown>;
      daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] };
    };
    const current = weather.current ?? {};
    const daily = weather.daily ?? {};

    return {
      status: "available",
      source: "Open-Meteo",
      locationLabel,
      temperature: Math.round(asNumber(current.temperature_2m)),
      apparentTemperature: Math.round(asNumber(current.apparent_temperature)),
      humidity: Math.round(asNumber(current.relative_humidity_2m)),
      precipitation: asNumber(current.precipitation),
      windSpeed: Math.round(asNumber(current.wind_speed_10m)),
      conditionCode: asNumber(current.weather_code),
      condition: weatherLabelForCode(asNumber(current.weather_code)),
      refreshedAt: new Date().toISOString(),
      forecast: (daily.time ?? []).slice(0, 5).map((date, index) => ({
        date,
        conditionCode: asNumber(daily.weather_code?.[index]),
        condition: weatherLabelForCode(asNumber(daily.weather_code?.[index])),
        high: Math.round(asNumber(daily.temperature_2m_max?.[index])),
        low: Math.round(asNumber(daily.temperature_2m_min?.[index])),
        rainChance: Math.round(asNumber(daily.precipitation_probability_max?.[index])),
      })),
    };
  } catch (error) {
    console.warn("[Weather] district lookup failed", error);
    return {
      status: "unavailable",
      source: "Open-Meteo",
      locationLabel,
      message: "Weather is temporarily unavailable. Tap Refresh weather to try again.",
      refreshedAt: new Date().toISOString(),
    };
  }
}

function mandiHeaders(apiKey: string) {
  return { authorization: `Bearer ${apiKey}`, accept: "application/json" };
}

export async function getDistrictMandiPrice(
  location: z.infer<typeof districtLocationSchema>,
  cropName: z.infer<typeof supportedCropSchema>,
  fetcher: FetchLike = fetch,
): Promise<MandiStatus> {
  const refreshedAt = new Date().toISOString();
  const apiKey = process.env.CEDA_AGMARKNET_API_KEY;
  if (!apiKey) return { status: "unavailable", source: "CEDA Agmarknet", message: "Live mandi prices need a provider key.", refreshedAt };

  try {
    const [commodityResponse, geographyResponse] = await Promise.all([
      fetchWithTimeout(fetcher, "https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities", { headers: mandiHeaders(apiKey) }),
      fetchWithTimeout(fetcher, "https://api.ceda.ashoka.edu.in/v1/agmarknet/geographies", { headers: mandiHeaders(apiKey) }),
    ]);
    if (!commodityResponse.ok || !geographyResponse.ok) {
      return { status: "unavailable", source: "CEDA Agmarknet", message: "Live mandi prices are temporarily unavailable.", refreshedAt };
    }

    const commodities = await commodityResponse.json() as { commodities?: Array<{ id: number; name: string }> };
    const geographies = await geographyResponse.json() as { geographies?: Array<{ state_id: number; state_name: string; districts: Array<{ district_id: number; district_name: string }> }> };
    const commodity = commodities.commodities?.find((item) => commodityAliases[cropName].includes(normalized(item.name)));
    const state = geographies.geographies?.find((item) => normalized(item.state_name) === normalized(location.state));
    const district = state?.districts.find((item) => normalized(item.district_name) === normalized(location.district));
    if (!commodity || !state || !district) {
      return { status: "unavailable", source: "CEDA Agmarknet", message: "This crop or district is not listed in the current mandi feed.", refreshedAt };
    }

    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 14);
    const formatDate = (value: Date) => value.toISOString().slice(0, 10);
    const priceResponse = await fetchWithTimeout(fetcher, "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices", {
      method: "POST",
      headers: { ...mandiHeaders(apiKey), "content-type": "application/json" },
      body: JSON.stringify({ commodity_id: commodity.id, state_id: state.state_id, district_id: [district.district_id], from_date: formatDate(fromDate), to_date: formatDate(today) }),
    });
    if (!priceResponse.ok) return { status: "unavailable", source: "CEDA Agmarknet", message: "The mandi feed did not return a current price.", refreshedAt };

    const prices = await priceResponse.json() as { data?: Array<{ date: string; min_price: number; max_price: number; modal_price: number }> };
    const latest = [...(prices.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!latest) return { status: "unavailable", source: "CEDA Agmarknet", message: "No recent mandi price was found for this crop and district.", refreshedAt };

    return { status: "available", source: "CEDA Agmarknet", cropName, modalPrice: latest.modal_price, minPrice: latest.min_price, maxPrice: latest.max_price, observedOn: latest.date, refreshedAt };
  } catch (error) {
    console.warn("[Mandi] district price lookup failed", error);
    return { status: "unavailable", source: "CEDA Agmarknet", message: "Live mandi prices are temporarily unavailable.", refreshedAt };
  }
}

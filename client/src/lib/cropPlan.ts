export type CropAreaAllocation = {
  cropId: string;
  percent: number;
  acres: number;
};

export type CropPlanAllocationSnapshot = {
  totalAcres: number;
  allocations: Record<string, number>;
};

export type AllocationValidation =
  | { valid: true; totalPercent: number }
  | { valid: false; reason: "farm-area" | "crop-area" | "total"; totalPercent: number };

export type CropPlanSeason = "Kharif" | "Rabi";

export type SeasonalCropSuggestion = {
  id: string;
  season: CropPlanSeason;
  title: string;
  reason: string;
  crops: string[];
};

export function equalCropAllocation(cropIds: string[]): Record<string, number> {
  if (cropIds.length === 0) return {};
  const base = Math.floor((100 / cropIds.length) * 100) / 100;
  const result = Object.fromEntries(cropIds.map((cropId) => [cropId, base]));
  const remainder = Math.round((100 - base * cropIds.length) * 100) / 100;
  result[cropIds[cropIds.length - 1]] = Math.round((base + remainder) * 100) / 100;
  return result;
}

export function normalizeCropAllocation(
  cropIds: string[],
  snapshot: string | null | undefined,
  fallbackTotalAcres = 4.5,
): { totalAcres: number; percentages: Record<string, number> } {
  let parsed: Partial<CropPlanAllocationSnapshot> = {};
  try {
    parsed = snapshot ? JSON.parse(snapshot) as Partial<CropPlanAllocationSnapshot> : {};
  } catch {
    parsed = {};
  }

  const totalAcres = typeof parsed.totalAcres === "number" && Number.isFinite(parsed.totalAcres) && parsed.totalAcres > 0
    ? parsed.totalAcres
    : fallbackTotalAcres;
  const stored = parsed.allocations && typeof parsed.allocations === "object" ? parsed.allocations : {};
  const percentages = cropIds.reduce<Record<string, number>>((result, cropId) => {
    const value = stored[cropId];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) result[cropId] = value;
    return result;
  }, {});

  const hasCompleteStoredPlan = cropIds.every((cropId) => typeof percentages[cropId] === "number")
    && Math.abs(cropIds.reduce((sum, cropId) => sum + (percentages[cropId] ?? 0), 0) - 100) <= 0.05;
  return { totalAcres, percentages: hasCompleteStoredPlan ? percentages : equalCropAllocation(cropIds) };
}

export function validateCropAllocation(cropIds: string[], percentages: Record<string, number>, totalAcres: number): AllocationValidation {
  const totalPercent = Math.round(cropIds.reduce((sum, cropId) => sum + (percentages[cropId] ?? 0), 0) * 100) / 100;
  if (!Number.isFinite(totalAcres) || totalAcres <= 0) return { valid: false, reason: "farm-area", totalPercent };
  if (cropIds.some((cropId) => !Number.isFinite(percentages[cropId]) || (percentages[cropId] ?? 0) <= 0)) {
    return { valid: false, reason: "crop-area", totalPercent };
  }
  if (Math.abs(totalPercent - 100) > 0.05) return { valid: false, reason: "total", totalPercent };
  return { valid: true, totalPercent };
}

export function allocationRows(cropIds: string[], percentages: Record<string, number>, totalAcres: number): CropAreaAllocation[] {
  return cropIds.map((cropId) => ({
    cropId,
    percent: Math.round((percentages[cropId] ?? 0) * 100) / 100,
    acres: Math.round((totalAcres * (percentages[cropId] ?? 0) / 100) * 100) / 100,
  }));
}

export function currentCropPlanSeason(date = new Date()): CropPlanSeason {
  const month = date.getMonth() + 1;
  return month >= 6 && month <= 10 ? "Kharif" : "Rabi";
}

export function seasonalCropSuggestions(season: CropPlanSeason): SeasonalCropSuggestion[] {
  if (season === "Kharif") {
    return [
      { id: "kharif-balanced", season, title: "Maize + Soybean + Groundnut", reason: "A balanced monsoon shortlist across grain, oilseed, and pulse income streams.", crops: ["Maize", "Soybean", "Groundnut"] },
      { id: "kharif-fibre", season, title: "Cotton + Soybean", reason: "Pairs a long-season fibre crop with a shorter oilseed option for a more flexible Kharif plan.", crops: ["Cotton", "Soybean"] },
      { id: "kharif-water", season, title: "Rice + Maize", reason: "A water-aware combination for fields where rainfall, irrigation, and drainage can be managed separately.", crops: ["Rice", "Maize"] },
    ];
  }
  return [
    { id: "rabi-balanced", season, title: "Wheat + Chickpea", reason: "A practical cool-season pairing of grain and pulse for well-drained Rabi fields.", crops: ["Wheat", "Chickpea"] },
    { id: "rabi-diversified", season, title: "Wheat + Maize + Chickpea", reason: "Diversifies a cool-season shortlist while keeping one pulse option in the plan.", crops: ["Wheat", "Maize", "Chickpea"] },
    { id: "rabi-low-water", season, title: "Chickpea + Wheat", reason: "A lower-water starting point when residual soil moisture is available and irrigation is limited.", crops: ["Chickpea", "Wheat"] },
  ];
}

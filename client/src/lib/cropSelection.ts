export const MAX_SELECTED_CROPS = 3;

export type CropSelectionResult = {
  next: string[];
  reason?: "keep-one" | "limit";
};

export function toggleCropSelection(selected: string[], cropId: string): CropSelectionResult {
  if (selected.includes(cropId)) {
    if (selected.length === 1) return { next: selected, reason: "keep-one" };
    return { next: selected.filter((item) => item !== cropId) };
  }

  if (selected.length >= MAX_SELECTED_CROPS) return { next: selected, reason: "limit" };
  return { next: [...selected, cropId] };
}

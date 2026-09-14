export function getLocationErrorMessage(code?: number) {
  if (code === 1) return "Location permission was declined. Choose your village manually instead.";
  if (code === 2) return "CropWise could not determine this device’s location. Choose your village manually instead.";
  if (code === 3) return "Finding this device’s location took too long. Please try again or choose your village manually.";
  return "CropWise could not use this device’s location. Choose your village manually instead.";
}

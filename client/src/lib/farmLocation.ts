export type FarmLocation = {
  village: string;
  district: string;
  state: string;
};

const locationFieldLabels: Record<keyof FarmLocation, string> = {
  village: "Village or town",
  district: "District",
  state: "State",
};

function normalizeLocationField(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseManualFarmLocation(draft: FarmLocation): FarmLocation {
  const normalized = {
    village: normalizeLocationField(draft.village),
    district: normalizeLocationField(draft.district),
    state: normalizeLocationField(draft.state),
  };

  for (const key of Object.keys(normalized) as Array<keyof FarmLocation>) {
    const value = normalized[key];
    if (value.length < 2) throw new Error(`${locationFieldLabels[key]} must have at least 2 characters.`);
    if (value.length > 80) throw new Error(`${locationFieldLabels[key]} must be 80 characters or fewer.`);
    if(/[\u0000-\u001f<>]/.test(value)) {
      throw new Error(`${locationFieldLabels[key]} contains unsupported characters.`);
    }
  }

  return normalized;
}

export function formatFarmLocation(location: FarmLocation) {
  return [location.village, location.district, location.state].filter(Boolean).join(", ");
}

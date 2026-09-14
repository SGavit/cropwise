export type MarketValues = {
  price: number;
  trend: number;
};

function parseCurrencyInput(value: string) {
  return Number(value.replace(/,/g, "").trim());
}

export function parseMarketValues(priceInput: string, trendInput: string): MarketValues {
  const price = parseCurrencyInput(priceInput);
  const trend = parseCurrencyInput(trendInput);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Enter a positive price per quintal.");
  }
  if (!Number.isFinite(trend)) {
    throw new Error("Enter a valid 30-day change.");
  }
  if (price > 1_000_000 || Math.abs(trend) > 1_000_000) {
    throw new Error("Enter a realistic market value below ₹10,00,000.");
  }

  return { price: Math.round(price), trend: Math.round(trend) };
}

import { describe, expect, it } from "vitest";
import { getLocationErrorMessage } from "./locationStatus";

describe("getLocationErrorMessage", () => {
  it("explains permission denial with a manual fallback", () => {
    expect(getLocationErrorMessage(1)).toContain("declined");
    expect(getLocationErrorMessage(1)).toContain("manually");
  });

  it("provides a useful message when location is unavailable or times out", () => {
    expect(getLocationErrorMessage(2)).toContain("could not determine");
    expect(getLocationErrorMessage(3)).toContain("took too long");
  });
});

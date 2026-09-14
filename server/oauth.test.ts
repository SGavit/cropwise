import { describe, expect, it } from "vitest";
import { resolveDisplayName } from "./_core/oauth";

describe("resolveDisplayName", () => {
  it("preserves a saved custom display name over the provider name", () => {
    expect(resolveDisplayName("  Asha Patil  ", "Google Profile Name")).toBe("Asha Patil");
  });

  it("uses the provider name only when no saved name exists", () => {
    expect(resolveDisplayName(null, "Google Profile Name")).toBe("Google Profile Name");
    expect(resolveDisplayName("", "Google Profile Name")).toBe("Google Profile Name");
    expect(resolveDisplayName(undefined, "  ")).toBeNull();
  });
});

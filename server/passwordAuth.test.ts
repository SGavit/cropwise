import { describe, expect, it } from "vitest";
import { createResetToken, hashPassword, hashResetToken, normalizeEmail, verifyPassword } from "./passwordAuth";

describe("password authentication", () => {
  it("normalizes emails and never verifies the wrong password", async () => {
    expect(normalizeEmail(" Farmer@Example.COM ")).toBe("farmer@example.com");
    const encoded = await hashPassword("field-notes-2026");
    expect(encoded.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("field-notes-2026", encoded)).toBe(true);
    expect(await verifyPassword("wrong-password", encoded)).toBe(false);
  });

  it("creates a random expiring token and stores only its hash", () => {
    const first = createResetToken();
    const second = createResetToken();
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).toBe(hashResetToken(first.rawToken));
    expect(first.tokenHash).not.toContain(first.rawToken);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

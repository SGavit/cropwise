import { describe, expect, it } from "vitest";

describe("password-reset email provider", () => {
  it.skipIf(process.env.RESEND_INTEGRATION_TEST !== "1")("accepts the configured Resend API credential", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required to validate password-reset delivery.");
    }

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { allowKrishiExpertChat, answerKrishiExpert, krishiExpertInputSchema, resetKrishiExpertRateLimit } from "./krishiExpert";

describe("Krishi Expert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetKrishiExpertRateLimit();
  });

  it("validates bounded farmer questions and supported language inputs", () => {
    expect(krishiExpertInputSchema.safeParse({ question: "How should I prepare the field?", language: "hi" }).success).toBe(true);
    expect(krishiExpertInputSchema.safeParse({ question: "x", language: "en" }).success).toBe(false);
    expect(krishiExpertInputSchema.safeParse({ question: "What should I do?", language: "bn" }).success).toBe(false);
  });

  it("uses a concise Marathi safety prompt and returns normalized LLM text", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "  पेरणीपूर्वी मातीचा ओलावा तपासा.\n\nस्थानिक सल्ल्यानुसार बीज निवडा.  " } }],
    } as never);

    const result = await answerKrishiExpert({
      question: "या आठवड्यात पेरणीपूर्वी काय तपासावे?",
      language: "mr",
      cropName: "Maize",
      locationLabel: "Beed, Maharashtra",
    });

    expect(result.answer).toBe("पेरणीपूर्वी मातीचा ओलावा तपासा. स्थानिक सल्ल्यानुसार बीज निवडा.");
    const request = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(request?.model).toBe("gpt-5-mini");
    expect(request?.messages[0]?.content).toContain("Write in Marathi using Devanagari script");
    expect(request?.messages[0]?.content).toContain("Do not diagnose a disease with certainty");
    expect(request?.messages[1]?.content).toContain("Selected crop: Maize");
  });

  it("limits a client to ten expert questions per hour", () => {
    const client = "krishi-expert-test-client";
    const now = 25_000;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(allowKrishiExpertChat(client, now)).toBe(true);
    }
    expect(allowKrishiExpertChat(client, now)).toBe(false);
    expect(allowKrishiExpertChat(client, now + 60 * 60 * 1000 + 1)).toBe(true);
  });
});

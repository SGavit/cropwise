import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { supportedLanguageSchema } from "./farmData";

const EXPERT_RATE_WINDOW_MS = 60 * 60 * 1000;
const EXPERT_RATE_LIMIT = 10;
const expertChatAttempts = new Map<string, number[]>();

export const krishiExpertInputSchema = z.object({
  question: z.string().trim().min(2).max(600),
  language: supportedLanguageSchema.default("en"),
  cropName: z.string().trim().min(1).max(60).optional(),
  locationLabel: z.string().trim().min(1).max(140).optional(),
});

export function allowKrishiExpertChat(clientKey: string, now = Date.now()) {
  const windowStart = now - EXPERT_RATE_WINDOW_MS;
  const attempts = (expertChatAttempts.get(clientKey) ?? []).filter((timestamp) => timestamp >= windowStart);
  if (attempts.length >= EXPERT_RATE_LIMIT) {
    expertChatAttempts.set(clientKey, attempts);
    return false;
  }
  attempts.push(now);
  expertChatAttempts.set(clientKey, attempts);
  return true;
}

export function resetKrishiExpertRateLimit() {
  expertChatAttempts.clear();
}

function languageInstruction(language: "en" | "hi" | "mr") {
  if (language === "hi") return "Write in Hindi using Devanagari script.";
  if (language === "mr") return "Write in Marathi using Devanagari script.";
  return "Write in plain English.";
}

function conciseText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 2_000);
}

export async function answerKrishiExpert(input: z.infer<typeof krishiExpertInputSchema>) {
  const context = [
    input.cropName ? `Selected crop: ${input.cropName}.` : "No crop selected.",
    input.locationLabel ? `Farm area: ${input.locationLabel}.` : "Farm area was not provided.",
  ].join(" ");

  const response = await invokeLLM({
    maxCompletionTokens: 700,
    reasoning: { effort: "low" },
    messages: [
      {
        role: "system",
        content: `You are Krishi Expert for CropWise, a careful agricultural guidance assistant for Indian farmers. ${languageInstruction(input.language)} Give practical, concise, prevention-first guidance grounded only in the farmer's question and the stated context. Ask one clarifying question when it materially affects the answer. Do not diagnose a disease with certainty, promise yields or prices, prescribe pesticide names, chemical doses, restricted products, or treatment schedules. For urgent, spreading, unclear, livestock, poisoning, or safety-critical issues, advise the farmer to contact the local Krishi Vigyan Kendra, agricultural extension officer, or qualified agronomist. Use short paragraphs and at most four action bullets when needed. Clearly state uncertainty when information is incomplete.`,
      },
      {
        role: "user",
        content: `${context}\n\nFarmer question: ${input.question}`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Krishi Expert returned an empty response.");
  }
  return { answer: conciseText(content) };
}

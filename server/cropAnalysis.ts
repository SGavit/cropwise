import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

export const MAX_CROP_IMAGE_BYTES = 5 * 1024 * 1024;

const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const cropPhotoInputSchema = z.object({
  dataUrl: z.string().min(32).max(7_200_000),
  fileName: z.string().trim().min(1).max(120),
  mimeType: z.enum(supportedMimeTypes),
  language: z.enum(["en", "hi", "mr"]).default("en"),
});

export const cropAnalysisResultSchema = z.object({
  cropName: z.string().min(1).max(80),
  localName: z.string().min(1).max(80),
  scientificName: z.string().min(1).max(120),
  identificationConfidence: z.enum(["high", "moderate", "low"]),
  healthStatus: z.enum(["healthy", "attention", "uncertain"]),
  overview: z.string().min(1).max(420),
  visibleObservations: z.array(z.string().min(1).max(160)).min(1).max(4),
  likelyIssue: z.string().min(1).max(220),
  cropStage: z.string().min(1).max(100),
  nextSteps: z.array(z.string().min(1).max(180)).min(2).max(4),
  needsExpertReview: z.boolean(),
  recheckPrompt: z.string().min(1).max(180),
});

export type CropAnalysisResult = z.infer<typeof cropAnalysisResultSchema>;

export class CropPhotoValidationError extends Error {}

const anonymousScanWindows = new Map<string, { count: number; resetAt: number }>();
const ANONYMOUS_SCAN_LIMIT = 4;
const ANONYMOUS_SCAN_WINDOW_MS = 60 * 60 * 1000;

export function allowAnonymousQuickScan(clientKey: string, now = Date.now()) {
  anonymousScanWindows.forEach((value, key) => {
    if (value.resetAt <= now) anonymousScanWindows.delete(key);
  });

  const current = anonymousScanWindows.get(clientKey);
  if (!current) {
    anonymousScanWindows.set(clientKey, { count: 1, resetAt: now + ANONYMOUS_SCAN_WINDOW_MS });
    return true;
  }

  if (current.count >= ANONYMOUS_SCAN_LIMIT) return false;
  current.count += 1;
  return true;
}

function extensionForMimeType(mimeType: (typeof supportedMimeTypes)[number]) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function decodeCropPhoto(dataUrl: string, mimeType: (typeof supportedMimeTypes)[number]) {
  const pattern = new RegExp(`^data:${mimeType.replace("/", "\\/")};base64,([A-Za-z0-9+/=]+)$`);
  const match = dataUrl.match(pattern);
  if (!match?.[1]) {
    throw new CropPhotoValidationError("Please upload a JPEG, PNG, or WebP photo.");
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > MAX_CROP_IMAGE_BYTES) {
    throw new CropPhotoValidationError("Please use an image smaller than 5 MB.");
  }

  return buffer;
}

export function isSupportedCropPhotoMimeType(value: string): value is (typeof supportedMimeTypes)[number] {
  return supportedMimeTypes.includes(value as (typeof supportedMimeTypes)[number]);
}

export function validateCropPhotoBytes(imageBytes: Buffer, mimeType: string) {
  if (!isSupportedCropPhotoMimeType(mimeType)) {
    throw new CropPhotoValidationError("Please upload a JPEG, PNG, or WebP photo.");
  }
  if (imageBytes.length === 0 || imageBytes.length > MAX_CROP_IMAGE_BYTES) {
    throw new CropPhotoValidationError("Please use an image smaller than 5 MB.");
  }
  return mimeType;
}

const cropVisionSchema = {
  name: "crop_photo_assessment",
  strict: true,
  schema: {
    type: "object",
    properties: {
      cropName: { type: "string" },
      localName: { type: "string" },
      scientificName: { type: "string" },
      identificationConfidence: { type: "string", enum: ["high", "moderate", "low"] },
      healthStatus: { type: "string", enum: ["healthy", "attention", "uncertain"] },
      overview: { type: "string" },
      visibleObservations: { type: "array", items: { type: "string" } },
      likelyIssue: { type: "string" },
      cropStage: { type: "string" },
      nextSteps: { type: "array", items: { type: "string" } },
      needsExpertReview: { type: "boolean" },
      recheckPrompt: { type: "string" },
    },
    required: [
      "cropName",
      "localName",
      "scientificName",
      "identificationConfidence",
      "healthStatus",
      "overview",
      "visibleObservations",
      "likelyIssue",
      "cropStage",
      "nextSteps",
      "needsExpertReview",
      "recheckPrompt",
    ],
    additionalProperties: false,
  },
} as const;

function truncateText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : value;
}

function normalizeCropVisionResult(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  return {
    ...candidate,
    cropName: truncateText(candidate.cropName, 80),
    localName: truncateText(candidate.localName, 80),
    scientificName: truncateText(candidate.scientificName, 120),
    overview: truncateText(candidate.overview, 420),
    visibleObservations: Array.isArray(candidate.visibleObservations)
      ? candidate.visibleObservations.slice(0, 4).map((item) => truncateText(item, 160))
      : candidate.visibleObservations,
    likelyIssue: truncateText(candidate.likelyIssue, 220),
    cropStage: truncateText(candidate.cropStage, 100),
    nextSteps: Array.isArray(candidate.nextSteps)
      ? candidate.nextSteps.slice(0, 4).map((item) => truncateText(item, 180))
      : candidate.nextSteps,
    recheckPrompt: truncateText(candidate.recheckPrompt, 180),
  };
}

async function runCropVision(imageUrl: string, language: "en" | "hi" | "mr") {
  const languageInstruction = language === "hi"
    ? "Hindi in Devanagari script"
    : language === "mr"
      ? "Marathi in Devanagari script"
      : "plain English";
  const response = await invokeLLM({
    maxCompletionTokens: 1800,
    reasoning: { effort: "low" },
    messages: [
      {
        role: "system",
        content: `You are CropWise Vision, an agricultural image-screening assistant. Assess only what is visibly supported by the image. Identify the crop when reasonably clear; otherwise use an uncertain crop label and low confidence. Do not invent cultivar, soil, location, yield, disease, cause, or treatment. Do not prescribe chemicals, dosage, or restricted agricultural products. For potentially serious, unclear, or visibly spreading issues, set needsExpertReview to true and advise the farmer to contact a local agronomist. Keep every field concise: overview and likelyIssue each at most two short sentences, no more than four observations, and no more than three next steps. Write every farmer-facing free-text field in ${languageInstruction}; keep scientificName in standard Latin scientific notation. Return the requested JSON only.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Review this crop or leaf photo. Give a careful crop identification and visible-condition summary for a farmer. If image evidence is weak, explicitly say what additional close-up or whole-plant photo would help." },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: cropVisionSchema },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") {
    throw new Error("The crop analysis service returned an unexpected response.");
  }

  return cropAnalysisResultSchema.parse(normalizeCropVisionResult(JSON.parse(content)));
}

export async function analyzeCropPhoto(input: z.infer<typeof cropPhotoInputSchema>) {
  decodeCropPhoto(input.dataUrl, input.mimeType);
  const parsed = await runCropVision(input.dataUrl, input.language);
  const imageBytes = Buffer.from(input.dataUrl.split(",")[1], "base64");
  const extension = extensionForMimeType(input.mimeType);
  const { key, url: imageUrl } = await storagePut(
    `crop-analysis/${crypto.randomUUID()}.${extension}`,
    imageBytes,
    input.mimeType,
  );
  return {
    ...parsed,
    imageUrl,
    scanMode: "private" as const,
    language: input.language,
    privacyNotice: "Your image is stored in CropWise for this signed-in scan.",
    disclaimer: "This is an AI image screening, not a confirmed diagnosis or treatment prescription. Verify important decisions with a qualified local agronomist.",
  };
}

export async function analyzeCropPhotoWithoutStorage(input: z.infer<typeof cropPhotoInputSchema>) {
  decodeCropPhoto(input.dataUrl, input.mimeType);
  const parsed = await runCropVision(input.dataUrl, input.language);
  return {
    ...parsed,
    scanMode: "anonymous" as const,
    language: input.language,
    privacyNotice: "Quick scan does not save your photo or attach it to a CropWise account.",
    disclaimer: "This is an AI image screening, not a confirmed diagnosis or treatment prescription. Verify important decisions with a qualified local agronomist.",
  };
}

export async function analyzeCropPhotoBytesWithoutStorage(imageBytes: Buffer, mimeType: string, language: "en" | "hi" | "mr" = "en") {
  const validMimeType = validateCropPhotoBytes(imageBytes, mimeType);
  const dataUrl = `data:${validMimeType};base64,${imageBytes.toString("base64")}`;
  return analyzeCropPhotoWithoutStorage({
    dataUrl,
    fileName: `quick-scan.${extensionForMimeType(validMimeType)}`,
    mimeType: validMimeType,
    language,
  });
}

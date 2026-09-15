import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  analyzeCropPhoto,
  analyzeCropPhotoWithoutStorage,
  allowAnonymousQuickScan,
  CropPhotoValidationError,
  cropPhotoInputSchema,
  decodeCropPhoto,
  MAX_CROP_IMAGE_BYTES,
  validateCropPhotoBytes,
} from "./cropAnalysis";

const validCropVisionResponse = {
  cropName: "Tobacco",
  localName: "Tobacco",
  scientificName: "Nicotiana tabacum",
  identificationConfidence: "moderate",
  healthStatus: "attention",
  overview: "A broad-leaf crop is visible with a localized leaf lesion.",
  visibleObservations: ["Broad green leaf", "Single pale-centred lesion"],
  likelyIssue: "A local lesion is visible, but the cause cannot be confirmed from one image.",
  cropStage: "Mature leaf",
  nextSteps: ["Photograph both sides of the leaf.", "Check nearby leaves for similar signs."],
  needsExpertReview: true,
  recheckPrompt: "Share a close-up of the lesion and a whole-plant photo.",
};

describe("decodeCropPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a correctly labelled small JPEG data URL", () => {
    const dataUrl = `data:image/jpeg;base64,${Buffer.from("crop-photo").toString("base64")}`;
    expect(decodeCropPhoto(dataUrl, "image/jpeg").toString()).toBe("crop-photo");
  });

  it("rejects a mismatched media type", () => {
    const dataUrl = `data:image/png;base64,${Buffer.from("crop-photo").toString("base64")}`;
    expect(() => decodeCropPhoto(dataUrl, "image/jpeg")).toThrow(CropPhotoValidationError);
  });

  it("rejects image bytes above the configured limit", () => {
    const oversized = Buffer.alloc(MAX_CROP_IMAGE_BYTES + 1).toString("base64");
    expect(() => decodeCropPhoto(`data:image/jpeg;base64,${oversized}`, "image/jpeg")).toThrow("smaller than 5 MB");
  });

  it("accepts supported binary image bytes for the gateway-safe endpoint", () => {
    expect(validateCropPhotoBytes(Buffer.from("crop-photo"), "image/jpeg")).toBe("image/jpeg");
    expect(validateCropPhotoBytes(Buffer.from("crop-photo"), "image/webp")).toBe("image/webp");
  });

  it("rejects unsupported binary media types", () => {
    expect(() => validateCropPhotoBytes(Buffer.from("not-a-photo"), "text/plain")).toThrow(CropPhotoValidationError);
  });

  it("rejects malformed anonymous quick-scan inputs before analysis starts", () => {
    expect(cropPhotoInputSchema.safeParse({
      dataUrl: "not-an-image",
      fileName: "crop.txt",
      mimeType: "text/plain",
    }).success).toBe(false);
  });

  it("limits anonymous quick scans without retaining photo data", () => {
    const client = "quick-scan-unit-test-client";
    const now = 5_000;
    expect(allowAnonymousQuickScan(client, now)).toBe(true);
    expect(allowAnonymousQuickScan(client, now)).toBe(true);
    expect(allowAnonymousQuickScan(client, now)).toBe(true);
    expect(allowAnonymousQuickScan(client, now)).toBe(true);
    expect(allowAnonymousQuickScan(client, now)).toBe(false);
  });

  it("runs an anonymous quick scan without writing the uploaded image to storage", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validCropVisionResponse) } }],
    } as never);

    const result = await analyzeCropPhotoWithoutStorage({
      dataUrl: `data:image/jpeg;base64,${Buffer.from("crop-photo").toString("base64")}`,
      fileName: "crop.jpg",
      mimeType: "image/jpeg",
      language: "mr",
    });

    expect(storagePut).not.toHaveBeenCalled();
    expect(result.scanMode).toBe("anonymous");
    expect(result.language).toBe("mr");
    expect(result.imageUrl).toBeUndefined();
    expect(result.privacyNotice).toContain("does not save");
    expect(vi.mocked(invokeLLM).mock.calls[0]?.[0].messages[0]?.content).toContain("Marathi in Devanagari script");
  });

  it("sends the original image data to the provider before saving a private scan", async () => {
    const dataUrl = `data:image/jpeg;base64,${Buffer.from("crop-photo").toString("base64")}`;
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validCropVisionResponse) } }],
    } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "crop-analysis/test.jpg", url: "/storage/crop-analysis/test.jpg" });

    await analyzeCropPhoto({ dataUrl, fileName: "crop.jpg", mimeType: "image/jpeg", language: "en" });

    expect(vi.mocked(invokeLLM).mock.calls[0]?.[0].messages[1]?.content).toEqual([
      { type: "text", text: expect.any(String) },
      { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
    ]);
    expect(storagePut).toHaveBeenCalled();
  });
});

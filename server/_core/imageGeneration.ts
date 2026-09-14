import { storagePut } from "../storage";
import { ENV } from "./env";

export type GenerateImageOptions = { prompt: string; originalImages?: string[]; model?: string; quality?: string };
export type GenerateImageResponse = { url: string };

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.aiApiKey) throw new Error("AI_API_KEY is not configured");
  const base = ENV.aiApiUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/images/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${ENV.aiApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: options.model || ENV.imageModel, prompt: options.prompt, size: "1024x1024", quality: options.quality || "auto" }),
  });
  if (!response.ok) throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
  const result = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = result.data?.[0];
  if (!item) throw new Error("Image provider returned no image");
  if (item.b64_json) {
    const uploaded = await storagePut(`generated/${Date.now()}.png`, Buffer.from(item.b64_json, "base64"), "image/png");
    return { url: uploaded.url };
  }
  if (item.url) return { url: item.url };
  throw new Error("Image provider returned no usable image");
}

export type ImageModelInfo = { id?: string; model?: string };
export type ListImageModelsResponse = { models: ImageModelInfo[] };
export async function listImageModels(): Promise<ListImageModelsResponse> {
  if (!ENV.aiApiKey) throw new Error("AI_API_KEY is not configured");
  const response = await fetch(`${ENV.aiApiUrl.replace(/\/$/, "")}/v1/models`, { headers: { authorization: `Bearer ${ENV.aiApiKey}` } });
  if (!response.ok) throw new Error(`List image models failed: ${response.status}`);
  const result = await response.json() as { data?: Array<{ id: string }> };
  return { models: (result.data ?? []).map(m => ({ id: m.id, model: m.id })) };
}

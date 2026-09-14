const MAX_AVATAR_DATA_URL_LENGTH = 1_200_000;
const INITIAL_MAX_DIMENSION = 512;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.46];

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read this image."));
    image.src = dataUrl;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read this image."));
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
}

function renderJpeg(image: HTMLImageElement, maxDimension: number, quality: number) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot prepare this image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function prepareAvatarDataUrl(file: File) {
  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  for (const maxDimension of [INITIAL_MAX_DIMENSION, 384, 256]) {
    for (const quality of QUALITY_STEPS) {
      const result = renderJpeg(image, maxDimension, quality);
      if (result.length <= MAX_AVATAR_DATA_URL_LENGTH) return result;
    }
  }
  throw new Error("This image could not be compressed enough for upload.");
}

export const avatarUploadLimits = {
  maxFileBytes: 8 * 1024 * 1024,
  maxDataUrlLength: MAX_AVATAR_DATA_URL_LENGTH,
} as const;

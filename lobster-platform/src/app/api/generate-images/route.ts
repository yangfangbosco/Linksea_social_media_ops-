import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Resize image if too large (> 2MB), return base64 string
function loadImageAsBase64(filePath: string): string {
  const stats = fs.statSync(filePath);
  if (stats.size > 2 * 1024 * 1024) {
    // Use sips (macOS built-in) to resize
    const tmpPath = `/tmp/resized_${Date.now()}${path.extname(filePath)}`;
    try {
      execSync(`sips -Z 1024 "${filePath}" --out "${tmpPath}" 2>/dev/null`);
      const data = fs.readFileSync(tmpPath).toString("base64");
      fs.unlinkSync(tmpPath);
      return data;
    } catch {
      // Fallback: read original
      return fs.readFileSync(filePath).toString("base64");
    }
  }
  return fs.readFileSync(filePath).toString("base64");
}

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";
const GEMINI_API_KEY = "AIzaSyCF65WcJ2yE1nwKN-d2Pe3qkG2BwjDOBAo";
const GEMINI_MODEL = "gemini-3-pro-image-preview";

function callGemini(bodyJson: string): Record<string, unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  // Write body to temp file to avoid shell escaping issues
  const tmpFile = `/tmp/gemini_req_${Date.now()}.json`;
  fs.writeFileSync(tmpFile, bodyJson);
  try {
    const result = execSync(`curl -s --max-time 180 -X POST "${url}" -H "Content-Type: application/json" -d @${tmpFile}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 200000,
    });
    return JSON.parse(result);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* */ }
  }
}

function generateImage(prompt: string, aspectRatio: string, referenceImages: string[]): Buffer | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

  // Add reference image (max 1, auto-resize if > 2MB)
  for (const refPath of referenceImages.slice(0, 1)) {
    if (fs.existsSync(refPath)) {
      const data = loadImageAsBase64(refPath);
      const ext = path.extname(refPath).toLowerCase();
      const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
      parts.push({ inlineData: { mimeType: mimeMap[ext] || "image/png", data } });
    }
  }

  const ratioDesc: Record<string, string> = { "1:1": "square format", "3:4": "vertical portrait format (3:4)", "4:5": "vertical format (4:5)", "16:9": "wide horizontal format (16:9)" };
  const ratioText = ratioDesc[aspectRatio] || `aspect ratio ${aspectRatio}`;
  const textPrompt = referenceImages.length > 0
    ? `Based on the product in the reference image, generate a new high-quality ${ratioText} image. Keep product appearance consistent with the reference. ${prompt}. The image MUST be ${ratioText}. Professional, visually appealing.`
    : `Generate a new high-quality ${ratioText} image. ${prompt}. The image MUST be ${ratioText}. Professional, visually appealing, suitable for social media.`;
  parts.push({ text: textPrompt });

  const bodyJson = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });

  const result = callGemini(bodyJson);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((result as any).error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new Error(`Gemini: ${(result as any).error.code} ${(result as any).error.message?.slice(0, 100)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const candidate of ((result as any).candidates || [])) {
    for (const part of (candidate.content?.parts || [])) {
      if (part.inlineData) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { campaignId, platform } = await req.json();

  if (!campaignId || !platform) {
    return NextResponse.json({ error: "Missing campaignId or platform" }, { status: 400 });
  }

  const platformDir = path.join(CAMPAIGNS_DIR, campaignId, platform);
  const promptsPath = path.join(platformDir, "prompts.json");

  if (!fs.existsSync(promptsPath)) {
    return NextResponse.json({ error: "prompts.json not found" }, { status: 404 });
  }

  const promptsData = JSON.parse(fs.readFileSync(promptsPath, "utf-8"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images: any[] = Array.isArray(promptsData) ? promptsData : promptsData.images || [];

  const results: Array<{ name: string; saved: boolean; error?: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const name = img.name || `image-${i + 1}`;
    const prompt = [img.scene, img.style ? `Style: ${img.style}` : "", img.negative_prompt ? `Avoid: ${img.negative_prompt}` : ""].filter(Boolean).join(". ");
    const aspectRatio = img.aspect_ratio || img.aspectRatio || "1:1";

    const refs: string[] = [];
    for (const ref of (img.reference_images || img.image_refs || img.image_ref || [])) {
      const refStr = typeof ref === "string" ? ref : "";
      if (!refStr) continue;
      const fullPath = refStr.startsWith("/") ? refStr : path.join(CAMPAIGNS_DIR, campaignId, refStr);
      if (fs.existsSync(fullPath)) refs.push(fullPath);
    }

    const imgPath = path.join(platformDir, `${name}.png`);

    try {
      const buf = generateImage(prompt, aspectRatio, refs);
      if (buf) {
        fs.writeFileSync(imgPath, buf);
        results.push({ name, saved: true });
      } else {
        results.push({ name, saved: false, error: "no image returned" });
      }
    } catch (e) {
      results.push({ name, saved: false, error: (e as Error).message?.slice(0, 200) });
    }

    // Write intermediate results
    fs.writeFileSync(path.join(platformDir, "generate-result.json"), JSON.stringify({ campaignId, platform, results }, null, 2));
  }

  return NextResponse.json({ status: "ok", campaignId, platform, results });
}

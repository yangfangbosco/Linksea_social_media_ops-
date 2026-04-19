import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_ROOTS = [
  "/Users/fa/Documents/social-media-ops/Campaigns",
  "/Users/fa/Documents/social-media-ops/Products",
];

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const real = fs.realpathSync(filePath);
  const allowed = ALLOWED_ROOTS.some((root) => real.startsWith(fs.realpathSync(root)));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ext = path.extname(real).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const data = fs.readFileSync(real);

  return new NextResponse(data, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=60",
    },
  });
}

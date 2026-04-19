import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const ALLOWED_ROOTS = [
  "/Users/fa/Documents/social-media-ops/Campaigns",
  "/Users/fa/Documents/social-media-ops/Products",
];

export async function POST(req: NextRequest) {
  const { path: filePath } = await req.json();

  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const real = fs.realpathSync(filePath);
  const allowed = ALLOWED_ROOTS.some((root) => real.startsWith(fs.realpathSync(root)));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  fs.unlinkSync(filePath);
  return NextResponse.json({ status: "ok" });
}

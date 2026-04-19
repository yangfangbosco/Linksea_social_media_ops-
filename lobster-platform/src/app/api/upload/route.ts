import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";
const PRODUCTS_DIR = "/Users/fa/Documents/social-media-ops/Products";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const id = formData.get("id") as string | null;
  const type = formData.get("type") as string | null;

  if (!file || !id) {
    return NextResponse.json({ error: "Missing file or id" }, { status: 400 });
  }

  let saveDir: string;
  if (type === "products") {
    saveDir = path.join(PRODUCTS_DIR, id, "images");
  } else {
    saveDir = path.join(CAMPAIGNS_DIR, id, "assets");
  }

  fs.mkdirSync(saveDir, { recursive: true });
  const savePath = path.join(saveDir, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(savePath, buffer);

  return NextResponse.json({ status: "ok", path: savePath });
}

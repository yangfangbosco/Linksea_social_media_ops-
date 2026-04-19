import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { productId, action = "add" } = await req.json();
  const linkedPath = path.join(CAMPAIGNS_DIR, id, "linked-products.json");

  let ids: string[] = [];
  if (fs.existsSync(linkedPath)) {
    try { ids = JSON.parse(fs.readFileSync(linkedPath, "utf-8")); } catch { ids = []; }
  }

  if (action === "add" && !ids.includes(productId)) {
    ids.push(productId);
  } else if (action === "remove") {
    ids = ids.filter((i) => i !== productId);
  }

  fs.writeFileSync(linkedPath, JSON.stringify(ids, null, 2));
  return NextResponse.json({ status: "ok", linkedProducts: ids });
}

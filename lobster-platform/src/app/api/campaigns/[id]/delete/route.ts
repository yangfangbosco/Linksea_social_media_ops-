import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = path.join(CAMPAIGNS_DIR, id);

  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ status: "ok" });
}

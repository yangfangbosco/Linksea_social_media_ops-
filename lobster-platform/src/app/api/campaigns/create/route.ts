import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";

export async function POST(req: NextRequest) {
  const { campaignId } = await req.json();

  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  const campaignDir = path.join(CAMPAIGNS_DIR, campaignId);

  if (fs.existsSync(campaignDir)) {
    return NextResponse.json({ error: "Campaign already exists" }, { status: 409 });
  }

  // Create folder structure
  fs.mkdirSync(path.join(campaignDir, "assets"), { recursive: true });

  // Write campaign.json with title
  fs.writeFileSync(
    path.join(campaignDir, "campaign.json"),
    JSON.stringify({ id: campaignId, title: "新项目", status: "planning", createdAt: new Date().toISOString() }, null, 2)
  );

  return NextResponse.json({ status: "ok", campaignId });
}

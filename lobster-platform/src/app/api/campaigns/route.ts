import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/campaigns";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

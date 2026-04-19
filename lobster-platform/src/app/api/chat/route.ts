import { NextRequest, NextResponse } from "next/server";
import { execSync, exec } from "child_process";

export async function POST(req: NextRequest) {
  const { message, campaignId, agent = "content-planner", async: isAsync = false } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const fullMessage = campaignId
    ? `请为项目 ${campaignId} 执行以下操作：\n\n${message}`
    : message;

  const cmd = `openclaw agent --agent ${agent} --message ${JSON.stringify(fullMessage)}`;

  if (isAsync) {
    // Fire and forget (used for project creation where we redirect immediately)
    exec(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
    return NextResponse.json({ status: "ok", campaignId });
  }

  // Sync: wait for agent to finish
  try {
    const result = execSync(cmd, { timeout: 300000, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    return NextResponse.json({ status: "done", reply: result.trim(), campaignId });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { status: "error", error: error.message?.slice(0, 300) },
      { status: 500 }
    );
  }
}

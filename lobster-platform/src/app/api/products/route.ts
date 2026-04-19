import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct } from "@/lib/products";

export async function GET() {
  return NextResponse.json(listProducts());
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  // Generate slug from name
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    || `product-${Date.now()}`;

  createProduct(id, name);
  return NextResponse.json({ status: "ok", id, name });
}

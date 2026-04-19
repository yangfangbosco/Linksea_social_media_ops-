"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface ProductSummary {
  id: string;
  name: string;
  description: string;
  imageCount: number;
  coverImage: string | null;
  mtime: number;
}

function fileUrl(p: string) {
  return "/api/file?path=" + encodeURIComponent(p);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((data) => { setProducts(data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-muted text-sm">加载中...</div>;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        <div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">产品资料</h1>
              <p className="text-sm text-muted">{products.length} 个产品</p>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {/* Create Card */}
            <div
              onClick={() => setShowCreate(true)}
              className="bg-white rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-all hover:shadow-md hover:shadow-primary/5 group"
            >
              <div className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center text-2xl text-muted group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-3">+</div>
              <p className="text-sm font-medium text-muted group-hover:text-primary transition-colors">添加新产品</p>
            </div>

            {products.map((p) => (
              <Link href={`/products/${p.id}`} key={p.id} className="group">
                <div className="bg-white rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                  <div className="h-40 relative bg-surface-bright overflow-hidden">
                    {p.coverImage ? (
                      <img src={fileUrl(p.coverImage)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-sm">No Image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold leading-snug mb-2 group-hover:text-primary transition-colors">{p.name}</h3>
                    {p.description && <p className="text-xs text-muted line-clamp-2 mb-2">{p.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted pt-2 border-t border-border/60">
                      <span>{p.imageCount} 张图片</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-border w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">添加新产品</h3>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="产品名称，例如：AI 美拍机 S1"
              className="w-full bg-surface-bright border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 mb-4"
              disabled={creating}
              onKeyDown={(e) => e.key === "Enter" && createName.trim() && !creating && handleCreate()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCreate(false); setCreateName(""); }} disabled={creating} className="px-4 py-2 text-sm text-secondary hover:text-foreground transition-colors disabled:opacity-40">取消</button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || creating}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function handleCreate() {
    if (!createName.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    setShowCreate(false);
    setCreateName("");
    router.push(`/products/${data.id}`);
  }
}

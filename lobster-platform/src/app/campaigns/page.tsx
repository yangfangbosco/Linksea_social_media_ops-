"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampaignSummary } from "@/lib/campaigns";
import Sidebar from "@/components/Sidebar";

function generateCampaignId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "C";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planning: { label: "策划中", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  writing: { label: "撰写中", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  complete: { label: "已完成", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
  if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
  return Math.floor(diff / 86400) + " 天前";
}

function fileUrl(p: string) {
  return "/api/file?path=" + encodeURIComponent(p);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/campaigns").then((r) => r.json()).then((data) => { setCampaigns(data); setLoading(false); });
  }, []);

  const filtered = campaigns.filter((c) => {
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-muted text-sm">加载中...</div>;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        <div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">社媒运营</h1>
              <p className="text-sm text-muted">{filtered.length} 个运营活动</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-lg text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 w-48"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-lg text-sm border border-border focus:border-primary focus:outline-none"
              >
                <option value="">全部</option>
                <option value="planning">策划中</option>
                <option value="writing">撰写中</option>
                <option value="complete">已完成</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted text-sm">暂无运营活动</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {/* Create Card */}
              <div
                onClick={async () => {
                  if (creatingNew) return;
                  setCreatingNew(true);
                  const id = generateCampaignId();
                  await fetch("/api/campaigns/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ campaignId: id }),
                  });
                  router.push(`/campaigns/${id}?new=1`);
                }}
                className="bg-white rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center min-h-[260px] cursor-pointer transition-all hover:shadow-md hover:shadow-primary/5 group"
              >
                <div className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center text-2xl text-muted group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-3">+</div>
                <p className="text-sm font-medium text-muted group-hover:text-primary transition-colors">{creatingNew ? "创建中..." : "创建新活动"}</p>
              </div>

              {filtered.map((c) => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.planning;
                return (
                  <div key={c.id} className="group relative">
                    <button
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm(`确定删除运营活动「${c.title}」？此操作不可撤销。`)) return;
                        await fetch(`/api/campaigns/${c.id}/delete`, { method: "POST" });
                        setCampaigns((prev) => prev.filter((p) => p.id !== c.id));
                      }}
                    >×</button>
                    <Link href={`/campaigns/${c.id}`}>
                      <div className="bg-white rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                        <div className="h-40 relative bg-surface-bright overflow-hidden">
                          {c.coverImage ? (
                            <img src={fileUrl(c.coverImage)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted text-sm">No Cover</div>
                          )}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${st.cls}`}>{st.label}</span>
                            {c.theme && <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 text-slate-600 bg-white/80 backdrop-blur-sm">{c.theme}</span>}
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-[11px] text-muted font-mono mb-1">{c.id}</p>
                          <h3 className="text-sm font-semibold leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2">{c.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted pt-3 border-t border-border/60">
                            <span>{c.fileCount} 文件</span>
                            <span>{c.imageCount} 图片</span>
                            <span>{timeAgo(c.mtime)}</span>
                            {c.platforms.length > 0 && <span className="ml-auto text-primary/70">{c.platforms.length} 平台</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

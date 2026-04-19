"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import type { CampaignDetail, PlatformInfo, FileInfo } from "@/lib/campaigns";
import EditableContent from "@/components/EditableContent";

function fileUrl(p: string) { return "/api/file?path=" + encodeURIComponent(p); }
function formatSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

const STAGES = [
  { key: "assets", label: "素材" },
  { key: "brief", label: "项目简介" },
  { key: "master", label: "母稿" },
  { key: "platform", label: "平台", children: [
    { key: "platform_linkedin", label: "LinkedIn" },
    { key: "platform_facebook", label: "Facebook" },
    { key: "platform_xiaohongshu", label: "小红书" },
    { key: "platform_gongzhonghao", label: "微信公众号" },
  ]},
  { key: "files", label: "所有文件" },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planning: { label: "策划中", cls: "text-amber-600" },
  writing: { label: "撰写中", cls: "text-blue-600" },
  complete: { label: "已完成", cls: "text-emerald-600" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("assets");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [initInput, setInitInput] = useState("");
  const [initProcessing, setInitProcessing] = useState(false);

  const fetchData = useCallback(() => {
    return fetch(`/api/campaigns/${id}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchData().then(() => {
      if (searchParams.get("new") === "1") {
        setShowInitDialog(true);
      }
    });
  }, [id, fetchData, searchParams]);

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-muted text-sm">加载中...</div>;

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted text-sm gap-4">
      <p>该项目不存在或已被删除</p>
      <Link href="/campaigns" className="text-primary hover:underline text-xs">返回列表</Link>
    </div>
  );

  const st = STATUS_MAP[data.status] || STATUS_MAP.planning;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/campaigns" className="text-xs text-muted hover:text-primary transition-colors">← 返回列表</Link>
          <div className="mt-3 p-3 rounded-lg bg-surface-bright">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Campaign</p>
            <h2 className="text-sm font-semibold leading-snug">{data.title}</h2>
            <p className="text-[11px] text-muted font-mono mt-1">{data.id}</p>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {STAGES.map((s) => (
            <div key={s.key}>
              {s.children ? (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider mt-2">{s.label}</div>
                  <div className="space-y-0.5">
                    {s.children.map((child) => (
                      <button
                        key={child.key}
                        onClick={() => setActiveStage(child.key)}
                        className={`w-full px-3 py-2 pl-5 rounded-lg text-[13px] font-medium text-left transition-all ${
                          activeStage === child.key
                            ? "bg-primary/10 text-primary"
                            : "text-secondary hover:bg-surface-bright"
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setActiveStage(s.key)}
                  className={`w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-all ${
                    activeStage === s.key
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:bg-surface-bright"
                  }`}
                >
                  {s.label}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-muted">文件</span><span>{data.fileCount}</span></div>
          <div className="flex justify-between"><span className="text-muted">图片</span><span>{data.imageCount}</span></div>
          <div className="flex justify-between"><span className="text-muted">平台</span><span>{data.platforms?.length || 0}</span></div>
          <div className="flex justify-between"><span className="text-muted">状态</span><span className={`font-medium ${st.cls}`}>{st.label}</span></div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        <div>
          {activeStage === "assets" && <AssetsView assets={data.assets} linkedProducts={data.linkedProducts || []} onImg={setLightbox} campaignId={id} onRefresh={fetchData} />}
          {activeStage === "brief" && <BriefView content={data.briefContent} campaignId={id} onRefresh={fetchData} />}
          {activeStage === "master" && <MasterView content={data.masterCopy} campaignId={id} onRefresh={fetchData} />}
          {activeStage.startsWith("platform_") && <SinglePlatformView platform={data.platforms.find(p => "platform_" + p.name === activeStage)} name={activeStage.replace("platform_", "")} onImg={setLightbox} campaignId={id} onRefresh={fetchData} linkedProducts={data.linkedProducts || []} />}
          {activeStage === "files" && <FilesView files={data.allFiles} />}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="fixed top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white text-lg flex items-center justify-center z-[101]">×</button>
          <img src={lightbox} className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showInitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl border border-border w-[520px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">项目 {id}</h3>
            <p className="text-sm text-muted mb-4">请简述你想做的社媒运营内容，AI 将为你生成项目简介</p>
            <textarea
              value={initInput}
              onChange={(e) => setInitInput(e.target.value)}
              placeholder="例如：我想推广我们的 AI 数字人一体机产品，目标客户是展馆和博物馆..."
              rows={4}
              className="w-full bg-surface-bright border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 mb-4"
              disabled={initProcessing}
              autoFocus
            />
            {initProcessing && (
              <div className="flex items-center gap-2 mb-4 text-xs text-primary">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                AI 正在生成项目简介...
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInitDialog(false)}
                disabled={initProcessing}
                className="px-4 py-2 text-sm text-secondary hover:text-foreground transition-colors disabled:opacity-40"
              >
                跳过
              </button>
              <button
                onClick={async () => {
                  if (!initInput.trim() || initProcessing) return;
                  setInitProcessing(true);
                  try {
                    await fetch("/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        campaignId: id,
                        message: `项目 ${id} 已创建，请直接为该项目撰写项目简介（brief）。\n\n项目内容：${initInput.trim()}`,
                      }),
                    });
                    await fetchData();
                    setActiveStage("brief");
                  } catch { /* ignore */ }
                  setInitProcessing(false);
                  setShowInitDialog(false);
                }}
                disabled={!initInput.trim() || initProcessing}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {initProcessing ? "生成中..." : "开始"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {count !== undefined && <span className="text-xs text-muted">{count} 项</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface AssetTask {
  id: number;
  type: "url" | "search";
  label: string;
  status: "running" | "done" | "error";
}

let taskCounter = 0;

interface LinkedProduct { id: string; name: string; images: FileInfo[]; }
interface ProductOption { id: string; name: string; }

function AssetsView({ assets, linkedProducts, onImg, campaignId, onRefresh }: { assets: FileInfo[]; linkedProducts: LinkedProduct[]; onImg: (u: string) => void; campaignId: string; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [urlValue, setUrlValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [tasks, setTasks] = useState<AssetTask[]>([]);
  const images = assets.filter((a) => a.isImage);
  const others = assets.filter((a) => !a.isImage);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "campaigns");
      fd.append("id", campaignId);
      await fetch("/api/upload", { method: "POST", body: fd });
    }
    setUploading(false);
    onRefresh();
  };

  const runAgentTask = async (type: "url" | "search", label: string, message: string) => {
    const taskId = ++taskCounter;
    const task: AssetTask = { id: taskId, type, label, status: "running" };
    setTasks((prev) => [...prev, task]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, message }),
      });
      const data = await res.json();
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: data.status === "done" ? "done" : "error" } : t));
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "error" } : t));
    }
    onRefresh();
    // 3 秒后移除已完成的任务
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }, 3000);
  };

  const handleUrlFetch = () => {
    if (!urlValue.trim()) return;
    const url = urlValue.trim();
    setShowUrlInput(false);
    setUrlValue("");
    runAgentTask("url", `抓取 ${url}`, `从以下网址抓取素材（文字和图片都要）：${url}`);
  };

  const handleSearch = () => {
    if (!searchValue.trim()) return;
    const desc = searchValue.trim();
    setShowSearchInput(false);
    setSearchValue("");
    runAgentTask("search", `搜索: ${desc}`, `搜索并下载以下素材到 assets 目录：${desc}`);
  };

  return (
    <div className="space-y-5">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <div
          className="flex-1 bg-white rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-5 text-center cursor-pointer transition-colors"
          onClick={() => document.getElementById("assetUpload")?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/40"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/40"); }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary/40"); handleUpload(e.dataTransfer.files); }}
        >
          <input id="assetUpload" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <p className="text-sm font-medium text-muted">{uploading ? "上传中..." : "上传图片"}</p>
          <p className="text-xs text-muted mt-1">点击或拖拽</p>
        </div>
        <div
          className="flex-1 bg-white rounded-xl border border-border hover:border-primary/40 p-5 text-center cursor-pointer transition-colors"
          onClick={() => { setShowUrlInput(!showUrlInput); setShowSearchInput(false); }}
        >
          <p className="text-sm font-medium text-muted">URL 抓取</p>
          <p className="text-xs text-muted mt-1">从网页抓取素材</p>
        </div>
        <div
          className="flex-1 bg-white rounded-xl border border-border hover:border-primary/40 p-5 text-center cursor-pointer transition-colors"
          onClick={() => { setShowSearchInput(!showSearchInput); setShowUrlInput(false); }}
        >
          <p className="text-sm font-medium text-muted">搜索素材</p>
          <p className="text-xs text-muted mt-1">AI 帮你找图</p>
        </div>
        <div
          className="flex-1 bg-white rounded-xl border border-border hover:border-primary/40 p-5 text-center cursor-pointer transition-colors"
          onClick={async () => {
            const res = await fetch("/api/products");
            const prods = await res.json();
            setAllProducts(prods);
            setShowProductPicker(!showProductPicker);
            setShowUrlInput(false);
            setShowSearchInput(false);
          }}
        >
          <p className="text-sm font-medium text-muted">关联产品</p>
          <p className="text-xs text-muted mt-1">引用产品图片</p>
        </div>
      </div>

      {/* Product Picker */}
      {showProductPicker && (
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm font-medium mb-3">选择要关联的产品</p>
          <div className="space-y-1.5">
            {allProducts.map((p) => {
              const isLinked = linkedProducts.some((lp) => lp.id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-bright">
                  <span className="text-sm">{p.name}</span>
                  <button
                    onClick={async () => {
                      await fetch(`/api/campaigns/${campaignId}/link-product`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productId: p.id, action: isLinked ? "remove" : "add" }),
                      });
                      onRefresh();
                    }}
                    className={`text-xs px-3 py-1 rounded transition-colors ${isLinked ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                  >
                    {isLinked ? "取消关联" : "关联"}
                  </button>
                </div>
              );
            })}
            {allProducts.length === 0 && <p className="text-xs text-muted text-center py-4">暂无产品，请先在产品资料中添加</p>}
          </div>
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && (
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm font-medium mb-2">输入网址，AI 将自动抓取页面上的文字和图片素材</p>
          <div className="flex gap-2">
            <input type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..."
              className="flex-1 bg-surface-bright border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()} />
            <button onClick={handleUrlFetch} disabled={!urlValue.trim()} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-40 transition-colors">抓取</button>
          </div>
        </div>
      )}

      {/* Search Input */}
      {showSearchInput && (
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm font-medium mb-2">描述你需要的素材，AI 将搜索并下载</p>
          <div className="flex gap-2">
            <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="例如：高清商场室内场景图、竞品美拍机产品介绍..."
              className="flex-1 bg-surface-bright border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <button onClick={handleSearch} disabled={!searchValue.trim()} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-40 transition-colors">搜索</button>
          </div>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${
              task.status === "running" ? "bg-primary/5 border border-primary/20 text-primary" :
              task.status === "done" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" :
              "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {task.status === "running" && <span className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />}
              {task.status === "done" && <span className="shrink-0">✓</span>}
              {task.status === "error" && <span className="shrink-0">✗</span>}
              <span className="truncate">{task.status === "running" ? `正在处理: ${task.label}` : task.status === "done" ? `完成: ${task.label}` : `失败: ${task.label}`}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <Section title="图片素材" count={images.length}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {images.map((a) => (
              <div key={a.name} className="rounded-lg overflow-hidden border border-border hover:border-primary/40 cursor-pointer transition-colors relative group" onClick={() => onImg(fileUrl(a.path))}>
                <button
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                  onClick={async (e) => { e.stopPropagation(); await fetch("/api/delete-file", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: a.path }) }); onRefresh(); }}
                >×</button>
                <img src={fileUrl(a.path)} className="w-full h-36 object-cover" />
                <div className="px-2.5 py-2 text-xs text-muted flex justify-between"><span className="truncate">{a.name}</span><span>{formatSize(a.size)}</span></div>
              </div>
            ))}
          </div>
        </Section>
      )}
      {others.length > 0 && (
        <Section title="其他文件" count={others.length}>
          {others.map((f) => <FileRow key={f.name} file={f} />)}
        </Section>
      )}
      {assets.length === 0 && !uploading && tasks.length === 0 && linkedProducts.length === 0 && <Empty text="暂无素材" />}

      {/* Linked Products */}
      {linkedProducts.map((lp) => (
        <Section key={lp.id} title={`产品素材：${lp.name}`} count={lp.images.length}>
          {lp.images.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {lp.images.map((img) => (
                <div key={img.name} className="rounded-lg overflow-hidden border border-border hover:border-primary/40 cursor-pointer transition-colors" onClick={() => onImg(fileUrl(img.path))}>
                  <img src={fileUrl(img.path)} className="w-full h-36 object-cover" />
                  <div className="px-2.5 py-2 text-xs text-muted flex justify-between"><span className="truncate">{img.name}</span><span>{formatSize(img.size)}</span></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">该产品暂无图片</p>
          )}
        </Section>
      ))}
    </div>
  );
}

function BriefView({ content, campaignId, onRefresh }: { content: string; campaignId: string; onRefresh: () => void }) {
  const [regenerating, setRegenerating] = useState(false);
  const handleRegenerate = async () => {
    setRegenerating(true);
    try { await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, message: `请重新生成项目 ${campaignId} 的 brief.md`, agent: "content-planner" }) }); } catch { /* */ }
    setRegenerating(false);
    onRefresh();
  };
  const filePath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/brief.md`;
  return <EditableContent content={content} filePath={filePath} title="项目简介" onRefresh={onRefresh} onRegenerate={handleRegenerate} regenerating={regenerating} />;
}

function MasterView({ content, campaignId, onRefresh }: { content: string; campaignId: string; onRefresh: () => void }) {
  const [regenerating, setRegenerating] = useState(false);
  const handleRegenerate = async () => {
    setRegenerating(true);
    try { await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, message: `请为项目 ${campaignId} 重新生成母稿 master-copy.md`, agent: "copywriter" }) }); } catch { /* */ }
    setRegenerating(false);
    onRefresh();
  };
  const filePath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/master-copy.md`;
  return <EditableContent content={content} filePath={filePath} title="母稿" onRefresh={onRefresh} onRegenerate={handleRegenerate} regenerating={regenerating} />;
}

function SinglePlatformView({ platform, name, onImg, campaignId, onRefresh, linkedProducts = [] }: { platform?: PlatformInfo; name: string; onImg: (u: string) => void; campaignId: string; onRefresh: () => void; linkedProducts?: LinkedProduct[] }) {
  const PLATFORM_LABELS: Record<string, string> = { linkedin: "LinkedIn", facebook: "Facebook", xiaohongshu: "小红书", gongzhonghao: "微信公众号" };
  const label = PLATFORM_LABELS[name] || name;
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          message: `请为项目 ${campaignId} 重新生成 ${label} 平台的文案，保存到 ${name}/content.md`,
          agent: "copywriter",
        }),
      });
    } catch { /* ignore */ }
    setRegenerating(false);
    onRefresh();
  };

  if (!platform) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={handleRegenerate} disabled={regenerating} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-40 transition-colors">
            {regenerating ? "生成中..." : `生成${label}文案`}
          </button>
        </div>
        <Empty text={`${label} 暂无内容`} />
      </div>
    );
  }

  // 从 content.md 中提取标题和正文
  const lines = (platform.content || "").split("\n");
  let title = "";
  let body = "";
  let hashtags = "";
  let section = "";
  for (const line of lines) {
    if (line.startsWith("## 标题")) { section = "title"; continue; }
    if (line.startsWith("## 正文")) { section = "body"; continue; }
    if (line.startsWith("## 标签") || line.startsWith("## Hashtag")) { section = "tags"; continue; }
    if (line.startsWith("## ")) { section = "other"; continue; }
    if (section === "title" && line.trim()) title = title || line.trim();
    if (section === "body") body += line + "\n";
    if (section === "tags" && line.trim()) hashtags = hashtags || line.trim();
  }
  if (!title && !body) body = platform.content || "";

  // prompts 可能是数组，或 {images: [...]} 对象
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let promptsList: any[] = [];
  if (Array.isArray(platform.prompts)) {
    promptsList = platform.prompts;
  } else if (platform.prompts && typeof platform.prompts === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = platform.prompts as any;
    if (Array.isArray(obj.images)) {
      promptsList = obj.images;
    } else {
      promptsList = [obj];
    }
  }

  const hasContent = !!platform.content;
  const hasStrategy = !!platform.visualStrategy;
  const hasPrompts = promptsList.length > 0;
  const hasImages = platform.images.length > 0;

  // 小红点：提示用户下一步该做什么
  const strategyDot = hasContent && !hasStrategy;
  const promptsDot = hasStrategy && !hasPrompts;
  const imagesDot = hasPrompts && !hasImages;

  const tabs = [
    { key: "content", label: "文案", show: true, dot: false },
    { key: "strategy", label: "视觉策略", show: true, dot: strategyDot },
    { key: "prompts", label: "提示词", show: true, dot: promptsDot },
    { key: "images", label: `配图${hasImages ? ` (${platform.images.length})` : ""}`, show: true, dot: imagesDot },
    { key: "preview", label: "效果预览", show: name === "linkedin" && hasContent, dot: false },
  ].filter(t => t.show);

  const [subTab, setSubTab] = useState(tabs[0]?.key || "content");

  if (regenerating) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <div className="flex gap-1.5 justify-center mb-3">
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-sm text-muted">AI 正在生成 {label} 文案...</p>
      </div>
    );
  }

  const hasAnything = platform.content || platform.images.length > 0 || platform.visualStrategy || platform.prompts;
  if (!hasAnything) return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleRegenerate} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          生成{label}文案
        </button>
      </div>
      <Empty text={`${label} 暂无内容`} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sub tabs + regenerate */}
      <div className="flex justify-between items-center border-b border-border pb-2">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)} className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${subTab === t.key ? "bg-white border border-border border-b-white text-primary -mb-[1px]" : "text-muted hover:text-foreground"}`}>
              {t.label}
              {t.dot && <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />}
            </button>
          ))}
        </div>
        <div />
      </div>

      {/* Content */}
      {subTab === "content" && (
        <EditableContent
          content={platform.content}
          filePath={`/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/${name}/content.md`}
          title={`${label} 文案`}
          onRefresh={onRefresh}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      )}

      {/* Preview */}
      {subTab === "preview" && name === "linkedin" && (
        <LinkedInPreview title={title} body={body.trim()} hashtags={hashtags} images={platform.images} onImg={onImg} />
      )}

      {/* Images */}
      {subTab === "strategy" && <StrategySubTab platform={platform} label={label} name={name} campaignId={campaignId} onRefresh={onRefresh} linkedProducts={linkedProducts} />}

      {subTab === "prompts" && <PromptsSubTab promptsList={promptsList} label={label} name={name} campaignId={campaignId} onRefresh={onRefresh} hasStrategy={hasStrategy} linkedProducts={linkedProducts} />}

      {subTab === "images" && <ImagesSubTab platform={platform} label={label} name={name} campaignId={campaignId} onImg={onImg} onRefresh={onRefresh} hasPrompts={hasPrompts} promptsList={promptsList} />}
    </div>
  );
}

function LinkedInPreview({ title, body, hashtags, images, onImg }: { title: string; body: string; hashtags: string; images: FileInfo[]; onImg: (u: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const previewBody = body.length > 300 && !expanded ? body.slice(0, 300) + "..." : body;

  return (
    <div className="max-w-[560px]">
      {/* LinkedIn Post Card */}
      <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-sm overflow-hidden">
        {/* Author Header */}
        <div className="p-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-lg font-bold shrink-0">L</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#191919]">LinkSea AI</p>
            <p className="text-xs text-[#666666] leading-tight">AI-Powered Digital Human Solutions | Making spaces smarter</p>
            <p className="text-xs text-[#666666] mt-0.5">1h • 🌐</p>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-4 pb-3">
          {title && <p className="text-sm font-semibold text-[#191919] mb-2">{title}</p>}
          <div className="text-sm text-[#191919] leading-relaxed whitespace-pre-wrap">{previewBody}</div>
          {body.length > 300 && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-sm text-[#666666] hover:text-[#0a66c2] hover:underline mt-1">...see more</button>
          )}
          {hashtags && <p className="text-sm text-[#0a66c2] mt-3">{hashtags}</p>}
        </div>

        {/* Post Image */}
        {images.length > 0 && (
          <div className="cursor-pointer" onClick={() => onImg(fileUrl(images[0].path))}>
            <img src={fileUrl(images[0].path)} className="w-full max-h-[400px] object-cover" />
          </div>
        )}

        {/* Engagement Bar */}
        <div className="px-4 py-2 border-t border-[#e0e0e0]">
          <div className="flex items-center gap-1 text-xs text-[#666666]">
            <span className="flex items-center">
              <span className="w-4 h-4 rounded-full bg-[#0a66c2] text-white text-[10px] flex items-center justify-center">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center -ml-1">❤️</span>
            </span>
            <span className="ml-1">128</span>
            <span className="ml-auto">24 comments • 8 reposts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-1 border-t border-[#e0e0e0] flex">
          {["Like", "Comment", "Repost", "Send"].map((action) => (
            <button key={action} className="flex-1 py-3 text-xs font-semibold text-[#666666] hover:bg-[#f5f5f5] rounded-lg transition-colors">
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Multiple images carousel hint */}
      {images.length > 1 && (
        <div className="mt-4">
          <p className="text-xs text-muted mb-2">其他配图（{images.length} 张）</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img) => (
              <div key={img.name} className="shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-border hover:border-primary/40 cursor-pointer transition-colors" onClick={() => onImg(fileUrl(img.path))}>
                <img src={fileUrl(img.path)} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilesView({ files }: { files: FileInfo[] }) {
  return (
    <Section title="所有文件" count={files.length}>
      <div className="space-y-0.5">
        {files.map((f) => <FileRow key={f.relativePath} file={f} showRelative />)}
      </div>
    </Section>
  );
}

function FileRow({ file, showRelative }: { file: FileInfo; showRelative?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const isText = /\.(md|json|txt|csv)$/i.test(file.name);

  const loadPreview = async () => {
    if (preview !== null) { setPreview(null); return; }
    const res = await fetch(fileUrl(file.path));
    const text = await res.text();
    setPreview(text);
  };

  return (
    <div>
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-bright transition-colors">
        <span className="text-sm truncate">{showRelative ? file.relativePath : file.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted">{formatSize(file.size)}</span>
          {isText && (
            <button onClick={loadPreview} className={`text-xs px-2.5 py-1 rounded border transition-colors ${preview !== null ? "border-primary/40 text-primary bg-primary/5" : "border-border text-secondary hover:text-primary hover:border-primary/40"}`}>
              {preview !== null ? "收起" : "预览"}
            </button>
          )}
          <a href={fileUrl(file.path)} download={file.name} className="text-xs px-2.5 py-1 rounded border border-border text-secondary hover:text-primary hover:border-primary/40 transition-colors">下载</a>
        </div>
      </div>
      {preview !== null && (
        <div className="mx-3 mb-2 p-4 rounded-lg bg-surface-bright border border-border">
          <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">{preview}</pre>
        </div>
      )}
    </div>
  );
}

function AgentButton({ label, loading, onClick, disabled, isRegenerate = false }: { label: string; loading: boolean; onClick: () => void; disabled?: boolean; isRegenerate?: boolean }) {
  const cls = isRegenerate
    ? "border border-border text-secondary hover:text-primary hover:border-primary/40"
    : "bg-primary text-white hover:bg-primary-dark";
  return (
    <button onClick={onClick} disabled={loading || disabled} className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 transition-colors ${cls}`}>
      {loading ? "处理中..." : label}
    </button>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-8 text-center">
      <div className="flex gap-1.5 justify-center mb-3">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StrategySubTab({ platform, label, name, campaignId, onRefresh, linkedProducts = [] }: { platform: PlatformInfo; label: string; name: string; campaignId: string; onRefresh: () => void; linkedProducts?: LinkedProduct[] }) {
  const [loading, setLoading] = useState(false);
  const productHint = linkedProducts.length > 0
    ? `\n\n该项目关联了以下产品，每张配图都必须融入产品元素作为参考图：\n${linkedProducts.map(p => `- ${p.name}：图片位于 /Users/fa/Documents/social-media-ops/Products/${p.id}/images/`).join("\n")}`
    : "";
  const generate = async () => {
    setLoading(true);
    try { await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, message: `请为项目 ${campaignId} 的 ${label} 平台生成配图建议，保存到 ${name}/visual-strategy.md${productHint}`, agent: "visualizer" }) }); } catch { /* */ }
    setLoading(false);
    onRefresh();
  };
  const filePath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/${name}/visual-strategy.md`;
  return <EditableContent content={platform.visualStrategy} filePath={filePath} title="视觉策略" onRefresh={onRefresh} onRegenerate={generate} regenerating={loading} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PromptsSubTab({ promptsList, label, name, campaignId, onRefresh, hasStrategy, linkedProducts = [] }: { promptsList: any[]; label: string; name: string; campaignId: string; onRefresh: () => void; hasStrategy: boolean; linkedProducts?: LinkedProduct[] }) {
  const [loading, setLoading] = useState(false);
  const productHint = linkedProducts.length > 0
    ? `\n\n该项目关联了以下产品，每张图的 reference_images 中必须包含该产品的图片：\n${linkedProducts.map(p => `- ${p.name}：图片位于 /Users/fa/Documents/social-media-ops/Products/${p.id}/images/（请先读取该目录确认有哪些图片可用）`).join("\n")}`
    : "";
  const generate = async () => {
    setLoading(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, message: `请为项目 ${campaignId} 的 ${label} 平台设计生图提示词矩阵，保存到 ${name}/prompts.json${productHint}`, agent: "visualizer" }),
      });
    } catch { /* ignore */ }
    setLoading(false);
    onRefresh();
  };

  const [editingJson, setEditingJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const filePath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/${name}/prompts.json`;

  const saveJson = async () => {
    try { JSON.parse(jsonDraft); } catch { alert("JSON 格式错误"); return; }
    await fetch("/api/save-file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: filePath, content: jsonDraft }) });
    setEditingJson(false);
    onRefresh();
  };

  if (loading) return <LoadingBlock text={`AI 正在设计 ${label} 配图提示词...`} />;

  if (promptsList.length === 0 && !editingJson) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <AgentButton label="生成提示词" loading={false} onClick={generate} disabled={!hasStrategy} />
        </div>
        {!hasStrategy && <p className="text-xs text-muted text-center">请先生成配图建议</p>}
        <Empty text="暂无提示词" />
      </div>
    );
  }

  if (editingJson) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditingJson(false)} className="px-3 py-1.5 text-xs text-secondary">取消</button>
          <button onClick={saveJson} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">保存</button>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <textarea value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} rows={25} className="w-full bg-surface-bright border border-border rounded-lg px-3 py-2.5 text-xs resize-y focus:border-primary focus:outline-none font-mono" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => { setJsonDraft(JSON.stringify(promptsList, null, 2)); setEditingJson(true); }} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-secondary hover:text-primary hover:border-primary/40 transition-colors">编辑 JSON</button>
        <AgentButton label="重新生成" loading={false} onClick={generate} isRegenerate />
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {promptsList.map((prompt: any, i: number) => (
        <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface-bright flex items-center justify-between">
            <h4 className="text-sm font-semibold">{(prompt.name as string) || `Prompt ${i + 1}`}</h4>
            {prompt.aspect_ratio && <span className="text-xs text-muted border border-border rounded px-2 py-0.5">{prompt.aspect_ratio as string}</span>}
          </div>
          <div className="p-5 space-y-3">
            {(prompt.aspect_ratio || prompt.aspectRatio) && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">尺寸</p><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{(prompt.aspect_ratio || prompt.aspectRatio) as string}</span></div>}
            {(prompt.goal || prompt.usage || prompt.purpose) && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">用途</p><p className="text-sm text-foreground/80">{(prompt.goal || prompt.usage || prompt.purpose) as string}</p></div>}
            {prompt.focus && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">重点</p><p className="text-sm text-foreground/80">{prompt.focus as string}</p></div>}
            {prompt.scene && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">场景描述</p><p className="text-sm text-foreground/80 leading-relaxed">{prompt.scene as string}</p></div>}
            {prompt.style && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">风格</p><div className="flex flex-wrap gap-1.5">{(prompt.style as string).split(",").map((s: string, j: number) => <span key={j} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.trim()}</span>)}</div></div>}
            {prompt.negative_prompt && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">排除项</p><div className="flex flex-wrap gap-1.5">{(prompt.negative_prompt as string).split(",").map((s: string, j: number) => <span key={j} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">{s.trim()}</span>)}</div></div>}
            {(prompt.reference_images || prompt.image_refs || prompt.image_ref) && (() => {
              const refs = ([] as string[]).concat(prompt.reference_images || prompt.image_refs || prompt.image_ref || []);
              const campaignPath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/`;
              return <div>
                <p className="text-[11px] text-muted uppercase tracking-wider mb-2">参考素材</p>
                <div className="flex gap-2 flex-wrap">
                  {refs.map((ref: string, j: number) => {
                    const fullPath = ref.startsWith("/") ? ref : campaignPath + ref;
                    const imgUrl = fileUrl(fullPath);
                    return <div key={j} className="flex flex-col items-center gap-1">
                      <img src={imgUrl} className="w-20 h-20 object-cover rounded-lg border border-border" />
                      <span className="text-[10px] text-muted truncate max-w-[80px]">{ref.split("/").pop()}</span>
                    </div>;
                  })}
                </div>
              </div>;
            })()}
            {prompt.title_suggestion && <div><p className="text-[11px] text-muted uppercase tracking-wider mb-1">标题建议</p><p className="text-sm font-medium text-foreground">{prompt.title_suggestion as string}</p></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImagesSubTab({ platform, label, name, campaignId, onImg, onRefresh, hasPrompts, promptsList }: { platform: PlatformInfo; label: string; name: string; campaignId: string; onImg: (u: string) => void; onRefresh: () => void; hasPrompts: boolean; promptsList?: any[] }) {
  const [generating, setGenerating] = useState(false);
  const [expectedCount, setExpectedCount] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);

  const generate = async () => {
    const count = promptsList?.length || 3;
    setExpectedCount(count);
    setGeneratedCount(0);
    setGenerating(true);

    // Call generate-images API directly, no agent needed
    fetch("/api/generate-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, platform: name }),
    }).then(() => {
      // When fully done, do a final refresh
      onRefresh();
      setGenerating(false);
    }).catch(() => {
      setGenerating(false);
    });
  };

  // Poll generate-result.json for progress
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(async () => {
      try {
        const resultPath = `/Users/fa/Documents/social-media-ops/Campaigns/${campaignId}/${name}/generate-result.json`;
        const res = await fetch(`/api/file?path=${encodeURIComponent(resultPath)}`);
        if (res.ok) {
          const data = await res.json();
          const saved = (data.results || []).filter((r: {saved?: boolean}) => r.saved).length;
          if (saved > generatedCount) {
            setGeneratedCount(saved);
            onRefresh();
          }
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating, campaignId, name, generatedCount]);

  const placeholderCount = generating ? Math.max(0, expectedCount - generatedCount) : 0;

  if (!generating && platform.images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <AgentButton label="生成配图" loading={false} onClick={generate} disabled={!hasPrompts} />
        </div>
        {!hasPrompts && <p className="text-xs text-muted text-center">请先生成提示词</p>}
        <Empty text="暂无配图" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {generating
          ? <span className="text-xs text-primary flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full animate-pulse" />生成中 ({generatedCount}/{expectedCount})</span>
          : <AgentButton label="重新生成" loading={false} onClick={generate} isRegenerate />
        }
      </div>
      <Section title={`${label} 配图`} count={generating ? expectedCount : platform.images.length}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {platform.images.map((img) => (
            <div key={img.name} className="rounded-lg overflow-hidden border border-border hover:border-primary/40 cursor-pointer transition-colors relative group" onClick={() => onImg(fileUrl(img.path))}>
              <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                onClick={async (e) => { e.stopPropagation(); await fetch("/api/delete-file", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: img.path }) }); onRefresh(); }}
              >×</button>
              <img src={fileUrl(img.path)} className="w-full h-36 object-cover" />
              <div className="px-2.5 py-2 text-xs text-muted truncate">{img.name}</div>
            </div>
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div key={`placeholder-${i}`} className="rounded-lg border-2 border-dashed border-border bg-surface-bright flex flex-col items-center justify-center h-[180px]">
              <div className="flex gap-1 mb-2">
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 100 + 150}ms` }} />
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 100 + 300}ms` }} />
              </div>
              <p className="text-xs text-muted">生成中...</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-16 text-muted text-sm">{text}</div>;
}

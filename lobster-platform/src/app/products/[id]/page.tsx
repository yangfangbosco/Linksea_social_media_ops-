"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  imageCount: number;
  coverImage: string | null;
  images: FileInfo[];
  allFiles: FileInfo[];
}

interface FileInfo {
  name: string;
  relativePath: string;
  path: string;
  size: number;
  isImage: boolean;
}

function fileUrl(p: string) { return "/api/file?path=" + encodeURIComponent(p); }
function formatSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("images");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const fetchData = useCallback(() => {
    return fetch(`/api/products/${id}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-muted text-sm">加载中...</div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted text-sm gap-4">
      <p>该产品不存在或已被删除</p>
      <Link href="/products" className="text-primary hover:underline text-xs">返回列表</Link>
    </div>
  );

  const tabs = [
    { key: "images", label: "产品图片" },
    { key: "description", label: "产品描述" },
    { key: "files", label: "所有文件" },
  ];

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "products");
      fd.append("id", id);
      await fetch("/api/upload", { method: "POST", body: fd });
    }
    setUploading(false);
    fetchData();
  };

  const saveDescription = async () => {
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: descDraft }),
    });
    setEditingDesc(false);
    fetchData();
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/products" className="text-xs text-muted hover:text-primary transition-colors">← 返回产品列表</Link>
          <div className="mt-3 p-3 rounded-lg bg-surface-bright">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">产品</p>
            <h2 className="text-sm font-semibold leading-snug">{data.name}</h2>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-all ${activeTab === t.key ? "bg-primary/10 text-primary" : "text-secondary hover:bg-surface-bright"}`}
            >{t.label}</button>
          ))}
        </nav>
        <div className="p-4 border-t border-border text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-muted">图片</span><span>{data.imageCount}</span></div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        {activeTab === "images" && (
          <div className="space-y-5">
            <div
              className="bg-white rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-8 text-center cursor-pointer transition-colors"
              onClick={() => document.getElementById("productUpload")?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/40"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/40"); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary/40"); handleUpload(e.dataTransfer.files); }}
            >
              <input id="productUpload" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              <p className="text-sm font-medium text-muted">{uploading ? "上传中..." : "点击或拖拽上传产品图片"}</p>
            </div>

            {data.images.length > 0 && (
              <div className="bg-white rounded-xl border border-border">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">产品图片</h3>
                  <span className="text-xs text-muted">{data.images.length} 张</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {data.images.map((img) => (
                      <div key={img.name} className="rounded-lg overflow-hidden border border-border hover:border-primary/40 cursor-pointer transition-colors relative group" onClick={() => setLightbox(fileUrl(img.path))}>
                        <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                          onClick={async (e) => { e.stopPropagation(); await fetch("/api/delete-file", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: img.path }) }); fetchData(); }}
                        >×</button>
                        <img src={fileUrl(img.path)} className="w-full h-36 object-cover" />
                        <div className="px-2.5 py-2 text-xs text-muted flex justify-between"><span className="truncate">{img.name}</span><span>{formatSize(img.size)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "description" && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">产品描述</h3>
              {!editingDesc && (
                <button onClick={() => { setDescDraft(data.fullDescription); setEditingDesc(true); }} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-secondary hover:text-primary hover:border-primary/40 transition-colors">
                  编辑
                </button>
              )}
            </div>
            <div className="p-5">
              {editingDesc ? (
                <div className="space-y-3">
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={15}
                    className="w-full bg-surface-bright border border-border rounded-lg px-3 py-2.5 text-sm resize-y focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono"
                    placeholder="支持 Markdown 格式..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingDesc(false)} className="px-3 py-1.5 text-xs text-secondary">取消</button>
                    <button onClick={saveDescription} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">保存</button>
                  </div>
                </div>
              ) : data.fullDescription ? (
                <div className="prose prose-sm max-w-none
                  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3
                  [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1
                  [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_p]:text-foreground/80
                  [&_ul]:text-sm [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:list-disc
                  [&_strong]:text-foreground [&_strong]:font-semibold
                ">
                  <Markdown>{data.fullDescription}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-muted">暂无描述，点击编辑添加</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">所有文件</h3>
              <span className="text-xs text-muted">{data.allFiles.length} 个</span>
            </div>
            <div className="p-5 space-y-1">
              {data.allFiles.map((f) => (
                <div key={f.relativePath} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-bright transition-colors">
                  <span className="text-sm truncate">{f.relativePath}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted">{formatSize(f.size)}</span>
                    <a href={fileUrl(f.path)} download={f.name} className="text-xs px-2.5 py-1 rounded border border-border text-secondary hover:text-primary hover:border-primary/40 transition-colors">下载</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="fixed top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white text-lg flex items-center justify-center z-[101]">×</button>
          <img src={lightbox} className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

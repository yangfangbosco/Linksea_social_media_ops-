"use client";

import { useState } from "react";
import Markdown from "react-markdown";

interface EditableContentProps {
  content: string;
  filePath: string;
  title: string;
  onRefresh: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  isJson?: boolean;
}

export default function EditableContent({ content, filePath, title, onRefresh, onRegenerate, regenerating, isJson }: EditableContentProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(content);
    setEditing(true);
  };

  const save = async () => {
    await fetch("/api/save-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content: draft }),
    });
    setEditing(false);
    onRefresh();
  };

  if (regenerating) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <div className="flex gap-1.5 justify-center mb-3">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted">AI 正在重新生成{title}...</p>
        </div>
      </div>
    );
  }

  if (!content && !editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          {onRegenerate && <button onClick={onRegenerate} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">生成{title}</button>}
        </div>
        <div className="text-center py-16 text-muted text-sm">暂无{title}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-secondary">取消</button>
            <button onClick={save} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">保存</button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-secondary hover:text-primary hover:border-primary/40 transition-colors">编辑</button>
            {onRegenerate && <button onClick={onRegenerate} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-secondary hover:text-primary hover:border-primary/40 transition-colors">重新生成</button>}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="p-5">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={20}
              className="w-full bg-surface-bright border border-border rounded-lg px-3 py-2.5 text-sm resize-y focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono"
            />
          ) : isJson ? (
            <pre className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto font-mono">{typeof content === "string" ? content : JSON.stringify(JSON.parse(content), null, 2)}</pre>
          ) : (
            <div className="prose prose-sm max-w-none max-h-[600px] overflow-y-auto
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4
              [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3
              [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_p]:text-foreground/80
              [&_ul]:text-sm [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:list-disc
              [&_ol]:text-sm [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal
              [&_li]:mb-1
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_code]:text-xs [&_code]:bg-surface-bright [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
              [&_pre]:bg-surface-bright [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-xs [&_pre]:overflow-x-auto
              [&_table]:text-sm [&_table]:w-full [&_table]:border-collapse [&_table]:my-3
              [&_th]:bg-surface-bright [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs
              [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-muted [&_blockquote]:italic
              [&_hr]:border-border [&_hr]:my-4
            ">
              <Markdown>{content}</Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

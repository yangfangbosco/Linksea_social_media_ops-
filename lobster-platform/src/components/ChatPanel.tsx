"use client";

import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

interface Message {
  role: "user" | "assistant" | "system";
  text: string;
}

interface ChatPanelProps {
  mode: "modal" | "sidebar";
  onClose: () => void;
  onCampaignCreated?: (id: string) => void;
  agent?: string;
}

export default function ChatPanel({ mode, onClose, onCampaignCreated, agent = "content-planner" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", text: "告诉我你今天想要发布什么内容吧～" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, agent }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: `出错了: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
        if (data.campaignId && onCampaignCreated) {
          onCampaignCreated(data.campaignId);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "网络错误，请重试" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const containerClass =
    mode === "modal"
      ? "fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      : "h-full flex flex-col";

  const panelClass =
    mode === "modal"
      ? "bg-white rounded-xl shadow-2xl border border-border w-[560px] max-h-[70vh] flex flex-col"
      : "bg-white border-l border-border flex flex-col h-full";

  const content = (
    <div className={panelClass}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm font-semibold">内容策划助手</p>
          <p className="text-[11px] text-muted">想得多 · AI 策划总监</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground text-lg leading-none">×</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : msg.role === "system"
                  ? "bg-surface-bright text-muted"
                  : "bg-surface-bright text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none
                  [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2
                  [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1
                  [&_p]:text-sm [&_p]:mb-1 [&_p]:leading-relaxed
                  [&_ul]:text-sm [&_ul]:pl-4 [&_ul]:mb-1 [&_ul]:list-disc
                  [&_li]:mb-0.5
                  [&_strong]:font-semibold
                  [&_code]:text-xs [&_code]:bg-white/50 [&_code]:px-1 [&_code]:rounded
                ">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-bright rounded-xl px-4 py-3 text-sm text-muted">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入内容..."
            rows={1}
            className="flex-1 bg-surface-bright border border-border rounded-lg px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className={containerClass} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>{content}</div>
      </div>
    );
  }

  return content;
}

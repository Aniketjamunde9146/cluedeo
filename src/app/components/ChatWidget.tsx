"use client";



import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiMessageCircle, FiX, FiSend, FiCheck, FiCopy } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

type WidgetMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  options?: string[];
};

const DEFAULT_OPTIONS = [
  "What does the Link Generator do?",
  "How does the Reply Generator work?",
  "Is my data stored anywhere?",
];

function createWelcomeMessage(): WidgetMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: "Hi! I can help you find your way around ClueFind. What are you trying to do?",
    options: DEFAULT_OPTIONS,
  };
}

/* ------------------------------------------------------------------ */
/* Minimal markdown renderer (bold + lists) — same approach used on   */
/* the AI Guide page, kept local so this widget has zero imports      */
/* outside itself.                                                    */
/* ------------------------------------------------------------------ */

function renderInlineBold(line: string, keyPrefix: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

function MessageBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] | null = null;

  const flush = (key: string) => {
    if (!listItems) return;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-4">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineBold(item, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      flush(`l-${idx}`);
      return;
    }
    const bullet = line.match(/^[-*]\s+(.*)/) ?? line.match(/^\d+[.)]\s+(.*)/);
    if (bullet) {
      if (!listItems) listItems = [];
      listItems.push(bullet[1]);
      return;
    }
    flush(`l-${idx}`);
    blocks.push(<p key={`p-${idx}`}>{renderInlineBold(line, `p-${idx}`)}</p>);
  });
  flush("l-end");

  return <div className="space-y-1.5">{blocks}</div>;
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: WidgetMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/site-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyForApi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message || "I couldn't generate a response.",
          options: data.options,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      if (input.trim()) sendMessage(input);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1400);
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showOptions = !loading && lastAssistant?.id === messages[messages.length - 1]?.id && !!lastAssistant?.options;

  return (
    <>
      {/* Launcher — hidden while the panel is open so it never sits on
          top of the composer on the mobile full-width sheet layout. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open help chat"
          aria-expanded={false}
          className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-[#F5A623]/40 bg-black shadow-[0_8px_24px_rgba(245,166,35,0.25)] transition-transform active:scale-95 sm:bottom-6 sm:right-6"
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,140,60,0.35) 0%, rgba(255,140,60,0) 70%)" }}
          />
          <HiSparkles className="relative z-10 h-5 w-5 text-[#F5A623]" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Site help chat"
          className="fixed inset-x-0 bottom-0 z-[65] flex h-[min(80vh,600px)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:bottom-24 sm:right-6 sm:left-auto sm:h-[520px] sm:w-[380px] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#0A0A0A]">
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,140,60,0.35) 0%, rgba(255,140,60,0) 65%)" }}
              />
              <HiSparkles className="relative z-10 h-3.5 w-3.5 text-[#F5A623]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">ClueFind Assistant</p>
              <p className="truncate text-[11px] text-zinc-500">Ask about the site or how to use it</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`break-words rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "border border-[#F5A623]/30 bg-white text-black"
                        : "border border-white/10 bg-white/[0.03] text-zinc-200"
                    }`}
                  >
                    <MessageBody content={msg.content} />
                    {msg.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="mt-1.5 flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-300"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <FiCheck className="h-3 w-3 text-[#22C55E]" /> Copied
                          </>
                        ) : (
                          <>
                            <FiCopy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623] [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3.5 py-2.5 text-[12px] text-red-300">
                {error}
              </div>
            )}

            {/* Quick-reply option chips — only after the latest assistant message */}
            {showOptions && (
              <div className="flex flex-wrap gap-1.5 pl-0.5">
                {lastAssistant!.options!.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(opt)}
                    disabled={loading}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#F5A623]/50 hover:text-[#F5A623] disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-white/10 bg-white/[0.02] p-2.5">
            <div className="flex items-end gap-2">
              <label htmlFor="widget-input" className="sr-only">
                Message
              </label>
              <textarea
                id="widget-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question…"
                disabled={loading}
                className="max-h-[80px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#F5A623]/50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#F5A623]/40 bg-white text-black transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSend className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop on mobile so the sheet reads as modal, tap outside to close */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/50 sm:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import StatusState from "@/app/components/Statusstate";
import { Metadata } from "next";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  options?: string[];
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "leadly_chat_sessions";
const MAX_SESSIONS = 25;
const TEXTAREA_MAX_HEIGHT = 120; // px, ~5 lines before it scrolls
const DEFAULT_SUGGESTIONS = [
  "How do I find my first client?",
  "What's the best way to approach potential clients?",
  "How do I stand out from competition?",
  "What should I include in my profile?",
];

function createWelcomeMessage(): Message {
  return {
    id: `welcome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "assistant",
    content:
      "Hi! 👋 I'm your Leadly guide. I'm here to help you find clients, master outreach, and grow your business. What would you like to know?",
    timestamp: Date.now(),
    options: DEFAULT_SUGGESTIONS,
  };
}

function createSession(): ChatSession {
  const now = Date.now();
  return {
    id: `session-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: "New conversation",
    messages: [createWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
}

function deriveTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 42).trimEnd()}…`;
}

function formatRelativeTime(ts: number) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* Buckets sessions the way most chat apps do, so the history list reads
   as "recent first" instead of one long undifferentiated column. */
function groupSessions(sorted: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 7 * 86400000;

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const s of sorted) {
    if (s.updatedAt >= startOfToday) groups[0].items.push(s);
    else if (s.updatedAt >= startOfYesterday) groups[1].items.push(s);
    else if (s.updatedAt >= startOfWeek) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter((g) => g.items.length > 0);
}

/* Shared liquid-glass badge: a diagonal gradient with a soft highlight,
   used everywhere the brand mark shows up (avatars, New chat, Send) so
   the whole app reads as one material instead of flat single-color fills.
   Collapsed to a single overlay layer (was three stacked divs) — same
   look, fewer nodes to paint on low-powered mobile GPUs. */
function LiquidBadge({
  icon,
  shape = "rounded-xl",
  size = "h-9 w-9",
  tone = "blue",
}: {
  icon: React.ReactNode;
  shape?: string;
  size?: string;
  tone?: "blue" | "red";
}) {
  const gradient =
    tone === "red"
      ? "from-[#FF6B6B] via-[#F5455C] to-[#8B1E3F]"
      : "from-[#4E74FF] via-[#2D5BFF] to-[#162E80]";
  return (
    <div
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${shape} ${size}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 85%, rgba(11,22,66,0.4) 0%, rgba(11,22,66,0) 60%)",
        }}
      />
      <div className="pointer-events-none absolute -inset-y-6 -left-1/2 w-1/3 -rotate-12 bg-white/50 opacity-0 blur-sm transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-70" />
      <span className="relative z-10 text-white">{icon}</span>
    </div>
  );
}

/* A confirm dialog that matches the rest of the app instead of the
   browser's native window.confirm() box. Sits above the safe area so
   the buttons never land under a phone's home indicator. */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!open || !panelRef.current) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 12, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out" }
      );
    },
    { dependencies: [open] }
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white bg-white/95 p-5 text-left shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md sm:p-6"
      >
        <div className="mb-4">
          <LiquidBadge
            icon={<Trash2 className="h-5 w-5" />}
            size="h-11 w-11"
            shape="rounded-2xl"
            tone="red"
          />
        </div>
        <h2
          id="confirm-dialog-title"
          className="text-[16px] font-bold text-slate-900"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-xl px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(239,68,68,0.28)] transition-transform active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Chat history list — shared between the static desktop rail and the
   mobile drawer, so both stay in lockstep automatically. Grouped into
   Today / Yesterday / Previous 7 days / Older, newest first. */
function SidebarList({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupSessions(sorted);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(45,91,255,0.28)] transition-transform active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%)",
            }}
          />
          <Plus className="relative z-10 h-4 w-4" />
          <span className="relative z-10">New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-slate-400">
            No conversations yet
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <ul className="sidebar-list space-y-1">
                {group.items.map((s) => {
                  const isActive = s.id === activeId;
                  const title = s.title || "New conversation";
                  return (
                    <li key={s.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(s.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-lg py-2.5 pl-3 pr-10 text-left transition-colors ${
                          isActive
                            ? "bg-blue-50 text-[#2D5BFF]"
                            : "text-slate-600 hover:bg-slate-100 active:bg-slate-100"
                        }`}
                      >
                        <MessageSquare
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isActive ? "text-[#2D5BFF]" : "text-slate-400"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold">
                            {title}
                          </span>
                          <span className="block truncate text-[10.5px] text-slate-400">
                            {formatRelativeTime(s.updatedAt)}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onDelete(s.id, e)}
                        aria-label={`Delete "${title}"`}
                        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 active:bg-red-50 active:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChatPageContent() {
  const container = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeId);
  const activeMessages = activeSession?.messages ?? [];
  const pendingSession = sessions.find((s) => s.id === pendingDeleteId);

  /* Load every saved chat on mount, resume the most recently active one */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: ChatSession[] = stored ? JSON.parse(stored) : [];

      if (parsed.length > 0) {
        const mostRecent = [...parsed].sort(
          (a, b) => b.updatedAt - a.updatedAt
        )[0];
        setSessions(parsed);
        setActiveId(mostRecent.id);
        setShowSuggestions(mostRecent.messages.length <= 1);
      } else {
        const fresh = createSession();
        setSessions([fresh]);
        setActiveId(fresh.id);
      }
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-scroll to bottom when the active thread changes */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeId]);

  /* Persist every session (capped) whenever anything changes */
  useEffect(() => {
    if (sessions.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sessions.slice(0, MAX_SESSIONS))
      );
    } catch (err) {
      console.error("Failed to save chat sessions:", err);
    }
  }, [sessions]);

  /* Lock body scroll + Escape-to-close for the mobile drawer */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    if (!sidebarOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  /* Entrance animation */
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".chat-header", { opacity: 0, y: -10, duration: 0.5 })
        .from(".chat-container", { opacity: 0, y: 20, duration: 0.6 }, "-=0.2")
        .from(
          ".sidebar-list li",
          { opacity: 0, x: -12, duration: 0.35, stagger: 0.04 },
          "-=0.4"
        );
    },
    { scope: container }
  );

  /* Reveal only genuinely new message bubbles — switching between chats
     in the sidebar should show the thread instantly, not replay every
     bubble's entrance animation. */
  const lastSeen = useRef<{ id: string; count: number }>({ id: "", count: 0 });
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const sameSession = lastSeen.current.id === activeId;
      const grew =
        sameSession && activeMessages.length > lastSeen.current.count;
      lastSeen.current = { id: activeId, count: activeMessages.length };

      if (reduced || !grew) {
        document
          .querySelectorAll(".msg-bubble")
          .forEach((el) => el.classList.add("msg-bubble-seen"));
        return;
      }

      gsap.from(".msg-bubble:not(.msg-bubble-seen)", {
        opacity: 0,
        y: 12,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          document
            .querySelectorAll(".msg-bubble")
            .forEach((el) => el.classList.add("msg-bubble-seen"));
        },
      });
    },
    { dependencies: [activeMessages.length, activeId], scope: container }
  );

  /* Keep the composer's height in sync with its content, capped so a
     long paste doesn't swallow the screen on a small phone. */
  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !activeId) return;

      setError(null);
      setShowSuggestions(false);

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: messageText.trim(),
        timestamp: Date.now(),
      };

      const historyForApi =
        sessions.find((s) => s.id === activeId)?.messages ?? [];

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages, userMessage],
                updatedAt: Date.now(),
                title:
                  s.title === "New conversation"
                    ? deriveTitle(userMessage.content)
                    : s.title,
              }
            : s
        )
      );
      setInput("");
      setLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.content,
            history: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData?.error || "Failed to get response from AI"
          );
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: data.message || "I couldn't generate a response.",
          timestamp: Date.now(),
          options: data.options || undefined,
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? {
                  ...s,
                  messages: [...s.messages, assistantMessage],
                  updatedAt: Date.now(),
                }
              : s
          )
        );
      } catch (err) {
        // Single source of truth for failures: set `error` and let the
        // StatusState card below show it + a retry button, instead of
        // also pushing a duplicate "Sorry, I encountered an error" bubble.
        const errorMsg =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [sessions, activeId]
  );

  const handleRetry = useCallback(() => {
    const lastUser = [...activeMessages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUser) handleSendMessage(lastUser.content);
  }, [activeMessages, handleSendMessage]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    });
  };

  /* Start a brand new chat, on top of the sidebar, without touching
     any previous conversation. */
  const handleNewChat = useCallback(() => {
    const fresh = createSession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setShowSuggestions(true);
    setError(null);
    setSidebarOpen(false);
  }, []);

  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    setActiveId(id);
    setShowSuggestions(!!target && target.messages.length <= 1);
    setError(null);
    setSidebarOpen(false);
  };

  /* Opens the custom confirm dialog instead of window.confirm() */
  const requestDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const cancelDeleteSession = () => setPendingDeleteId(null);

  const confirmDeleteSession = () => {
    const id = pendingDeleteId;
    if (!id) return;

    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);

      if (id !== activeId) return next;

      if (next.length > 0) {
        const mostRecent = [...next].sort(
          (a, b) => b.updatedAt - a.updatedAt
        )[0];
        setActiveId(mostRecent.id);
        setShowSuggestions(mostRecent.messages.length <= 1);
        return next;
      }

      const fresh = createSession();
      setActiveId(fresh.id);
      setShowSuggestions(true);
      return [fresh];
    });

    setPendingDeleteId(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F7F9FC]">
      {/* Desktop sidebar — always visible from md up */}
      <aside className="hidden md:flex md:w-72 md:shrink-0 md:flex-col md:border-r md:border-slate-200/70 md:bg-white/70 md:backdrop-blur-sm">
        <SidebarList
          sessions={sessions}
          activeId={activeId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onDelete={requestDeleteSession}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          sidebarOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div
          onClick={() => setSidebarOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chat history"
          className={`relative z-10 flex h-full w-[85%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4">
            <span className="text-[13px] font-bold text-slate-900">
              Chat history
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close chat history"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 active:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarList
            sessions={sessions}
            activeId={activeId}
            onSelect={handleSelectSession}
            onNew={handleNewChat}
            onDelete={requestDeleteSession}
          />
        </div>
      </div>

      {/* Main chat column */}
      <main
        id="main-content"
        ref={container}
        className="relative flex h-dvh min-w-0 flex-1 flex-col"
      >
        {/* Header */}
        <div
          className="chat-header shrink-0 border-b border-slate-200/50 bg-white/80 px-3 py-3 backdrop-blur-sm sm:px-6 sm:py-4"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-100 md:hidden"
                aria-label="Open chat history"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-100"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="hidden sm:block">
                <LiquidBadge icon={<Sparkles className="h-4 w-4" />} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900 sm:text-[18px]">
                  {activeSession?.title &&
                  activeSession.title !== "New conversation"
                    ? activeSession.title
                    : "Leadly AI Guide"}
                </h1>
                <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                  Get guidance on finding clients &amp; growing
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNewChat}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#2D5BFF] active:bg-blue-50 active:text-[#2D5BFF]"
              aria-label="Start new chat"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-container flex flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`msg-bubble flex items-end gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mb-1">
                    <LiquidBadge
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      size="h-7 w-7"
                      shape="rounded-full"
                    />
                  </div>
                )}

                <div
                  className={`flex max-w-[88%] flex-col gap-2 sm:max-w-[75%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#2D5BFF] text-white"
                        : "border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {msg.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="mt-2 flex min-h-[28px] items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-slate-600"
                        aria-label="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {msg.role === "assistant" && msg.options && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSuggestionClick(option)}
                          disabled={loading}
                          className="min-h-[36px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#2D5BFF] hover:text-[#2D5BFF] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading state */}
            {loading && (
              <div className="msg-bubble flex items-end justify-start gap-2">
                <div className="mb-1">
                  <LiquidBadge
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    size="h-7 w-7"
                    shape="rounded-full"
                  />
                </div>
                <StatusState
                  variant="loading"
                  density="compact"
                  heading="Thinking…"
                  className="max-w-[88%] sm:max-w-[75%]"
                />
              </div>
            )}

            {/* Error state, with retry */}
            {error && (
              <div className="msg-bubble flex justify-start">
                <StatusState
                  variant="error"
                  density="compact"
                  heading="Message didn't send"
                  description={error}
                  onRetry={handleRetry}
                  className="max-w-[88%] sm:max-w-[75%]"
                />
              </div>
            )}

            {/* Suggestions (only show at start) */}
            {showSuggestions && activeMessages.length <= 1 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/40 to-amber-50/40 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2D5BFF]" />
                  <p className="text-[12px] font-semibold text-slate-700">
                    Try asking about:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={loading}
                      className="min-h-[36px] rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:shadow-md hover:text-[#2D5BFF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div
          className="shrink-0 border-t border-slate-200/50 bg-white/80 px-3 pt-3 backdrop-blur-sm sm:px-6 sm:py-4"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about finding clients…"
              disabled={loading}
              // 16px min font-size prevents iOS Safari from auto-zooming
              // the page on focus — the previous 13px input triggered it.
              className="max-h-[120px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] leading-snug text-slate-900 caret-[#2D5BFF] placeholder-slate-400 outline-none transition-colors focus:border-[#2D5BFF] focus:bg-white disabled:cursor-not-allowed disabled:opacity-100 sm:text-[13px]"
            />
            <button
              type="button"
              onClick={() => handleSendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_6px_16px_rgba(45,91,255,0.28)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80]" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 22% 20%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
              <Send className="relative z-10 h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete this chat?"
        description={`"${
          pendingSession?.title || "This conversation"
        }" will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteSession}
        onCancel={cancelDeleteSession}
      />
    </div>
  );
}

/* Suspense boundary for Next.js App Router */
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#F7F9FC]" />}>
      <ChatPageContent />
    </Suspense>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Sparkles, Mail, Phone, MessageCircleReply } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const PROFILE_KEY = "leadly_reply_profile";

type Profile = { name: string; niche: string; experience: string; link: string };

type Result = {
  comment: string;
  followUpDm: string;
  contacts: { emails: string[]; phones: string[] };
};

/* Same liquid-glass gradient badge used in the navbar / chat page, so the
   material reads as one system instead of a one-off style on this page. */
function LiquidBadge({
  icon,
  size = "h-9 w-9",
  shape = "rounded-xl",
}: {
  icon: React.ReactNode;
  size?: string;
  shape?: string;
}) {
  return (
    <div
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80] ${shape} ${size}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 85%, rgba(11,22,66,0.4) 0%, rgba(11,22,66,0) 60%)",
        }}
      />
      <span className="relative z-10 text-white">{icon}</span>
    </div>
  );
}

/* Frosted glass panel — the base surface for every card on this page. */
function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/70 shadow-[0_8px_30px_rgba(16,22,43,0.06)] backdrop-blur-xl ${className}`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 30px rgba(16,22,43,0.06)",
      }}
    >
      {children}
    </div>
  );
}

const glassInput =
  "w-full rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none backdrop-blur-md transition-colors focus:border-[#2D5BFF]/50 focus:bg-white";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(45,91,255,0.28)] transition-transform active:scale-95"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80]" />
      {copied ? (
        <Check className="relative z-10 h-3.5 w-3.5" />
      ) : (
        <Copy className="relative z-10 h-3.5 w-3.5" />
      )}
      <span className="relative z-10">{copied ? "Copied" : label}</span>
    </button>
  );
}

export default function CommentGeneratorPage() {
  const container = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Profile>({
    name: "",
    niche: "",
    experience: "",
    link: "",
  });
  const [postText, setPostText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) setProfile(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".rg-header", { opacity: 0, y: -10, duration: 0.5 })
        .from(".rg-card", { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, "-=0.25");
    },
    { scope: container }
  );

  const resultRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (!result || !resultRef.current) return;
      if (reduced) return;
      gsap.from(resultRef.current.children, {
        opacity: 0,
        y: 14,
        duration: 0.45,
        stagger: 0.08,
        ease: "power3.out",
      });
    },
    { dependencies: [result], scope: container }
  );

  const handleGenerate = async () => {
    if (!postText.trim() || !profile.name.trim() || !profile.niche.trim()) {
      setError("Fill your name, niche, and paste the post first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, ...profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#F7F9FC]">
      {/* Soft floating gradient blobs — the "liquid" backdrop, fixed so they
          don't shift as the page scrolls and stay subtle behind the glass. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-40 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(78,116,255,0.5) 0%, rgba(78,116,255,0) 70%)",
          }}
        />
        <div
          className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full opacity-30 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,196,138,0.55) 0%, rgba(255,196,138,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-160px] left-1/3 h-[420px] w-[420px] rounded-full opacity-30 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(45,91,255,0.35) 0%, rgba(45,91,255,0) 70%)",
          }}
        />
      </div>

      <div
        ref={container}
        className="relative mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6"
      >
        {/* Header */}
        <div className="rg-header mb-6 flex items-center gap-3">
          <LiquidBadge
            icon={<MessageCircleReply className="h-5 w-5" />}
            size="h-11 w-11"
            shape="rounded-2xl"
          />
          <div>
            <h1 className="text-[19px] font-bold tracking-tight text-slate-900">
              Reply Generator
            </h1>
            <p className="text-[12.5px] text-slate-500">
              Paste a hiring post, get a human-sounding reply + follow-up DM.
            </p>
          </div>
        </div>

        {/* Profile card */}
        <GlassPanel className="rg-card p-4 sm:p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Your profile
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Your name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={glassInput}
            />
            <input
              placeholder="Niche (e.g. video editing)"
              value={profile.niche}
              onChange={(e) => setProfile({ ...profile, niche: e.target.value })}
              className={glassInput}
            />
            <input
              placeholder="Experience (e.g. 2+ years)"
              value={profile.experience}
              onChange={(e) =>
                setProfile({ ...profile, experience: e.target.value })
              }
              className={glassInput}
            />
            <input
              placeholder="Link (portfolio / WhatsApp)"
              value={profile.link}
              onChange={(e) => setProfile({ ...profile, link: e.target.value })}
              className={glassInput}
            />
          </div>
        </GlassPanel>

        {/* Post input card */}
        <GlassPanel className="rg-card mt-4 p-4 sm:p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Post to reply to
          </p>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Paste the hiring post / thread text here…"
            rows={6}
            className={`${glassInput} resize-none leading-relaxed`}
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="group relative mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[13px] font-semibold text-white shadow-[0_8px_22px_rgba(45,91,255,0.3)] transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80] bg-[length:200%_100%] bg-[position:0%_0%] transition-all duration-500 ease-out group-hover:bg-[position:100%_0%]" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 22% 20%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%)",
              }}
            />
            <Sparkles className="relative z-10 h-4 w-4" />
            <span className="relative z-10">
              {loading ? "Writing…" : "Generate reply"}
            </span>
          </button>

          {error && (
            <p className="mt-3 text-[12px] font-medium text-red-500">{error}</p>
          )}
        </GlassPanel>

        {/* Results */}
        {result && (
          <div ref={resultRef} className="mt-4 space-y-4">
            {(result.contacts.emails.length > 0 ||
              result.contacts.phones.length > 0) && (
              <GlassPanel className="rg-card border-amber-200/60 bg-amber-50/70 p-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  Found in post
                </p>
                <div className="space-y-1">
                  {result.contacts.emails.map((e) => (
                    <div
                      key={e}
                      className="flex items-center gap-1.5 text-[13px] text-amber-800"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {e}
                    </div>
                  ))}
                  {result.contacts.phones.map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-1.5 text-[13px] text-amber-800"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            <GlassPanel className="rg-card p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Reply to post
                </p>
                <CopyButton text={result.comment} label="Copy reply" />
              </div>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-800">
                {result.comment}
              </p>
            </GlassPanel>

            <GlassPanel className="rg-card p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  If they reply — send this
                </p>
                <CopyButton text={result.followUpDm} label="Copy DM" />
              </div>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-800">
                {result.followUpDm}
              </p>
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );
}
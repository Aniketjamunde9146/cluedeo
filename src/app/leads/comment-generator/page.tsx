"use client";

/**
 * app/leads/comment-generator/page.tsx (client component)
 *
 * Restyled in the "Magic UI" dark theme: pure-black background,
 * canvas starfield, warm amber ambient glow, gradient-masked
 * headline, and dark glass cards with a single amber highlight
 * accent (used here on the primary CTA + active segment, echoing
 * the theme's "one highlighted element" rule from its pricing card).
 *
 * Same functional behavior as the light-glass version — profile
 * persisted to localStorage, platform + contact-preference segmented
 * controls, generate call to /api/generate-comment — only the visual
 * language changed. Icons: react-icons (fi / hi2 / fa6). Buttons /
 * inputs: shadcn/ui primitives, restyled via className overrides to
 * match the theme tokens rather than swapped out.
 */

import { useEffect, useRef, useState } from "react";
import { FiCopy, FiCheck, FiMail, FiPhone, FiMessageCircle, FiMessageSquare, FiInfo } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import { FaLinkedin, FaXTwitter, FaThreads } from "react-icons/fa6";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Local UI primitives (no external component library required)       */
/* ------------------------------------------------------------------ */

function Button({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className} {...props} />;
}

function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={className} {...props} />;
}

const PROFILE_KEY = "leadly_reply_profile";

type Platform = "linkedin" | "twitter" | "threads";
type ContactPreference = "dm" | "email" | "comment";

type Profile = {
  name: string;
  niche: string;
  experience: string;
  link: string;
  email: string;
  platform: Platform;
  contactPreference: ContactPreference;
};

const DEFAULT_PROFILE: Profile = {
  name: "",
  niche: "",
  experience: "",
  link: "",
  email: "",
  platform: "linkedin",
  contactPreference: "dm",
};

type Result = {
  comment: string;
  followUpDm: string;
  nicheMatch: boolean;
  contacts: { emails: string[]; phones: string[] };
};

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

/* ------------------------------------------------------------------ */
/* Starfield canvas (Magic UI signature background element)           */
/* ------------------------------------------------------------------ */

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;

    type Star = { x: number; y: number; r: number; base: number; phase: number; speed: number };
    let stars: Star[] = [];

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const count = Math.floor((width * height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        base: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.15,
      }));
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.016;
      for (const s of stars) {
        const twinkle = prefersReduced ? s.base : s.base + Math.sin(t * s.speed + s.phase) * 0.35;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, twinkle))})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [prefersReduced]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/* Dark glass primitives                                              */
/* ------------------------------------------------------------------ */

function DarkPanel({
  children,
  className = "",
  highlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#0A0A0A] ${
        highlight ? "border-[1.5px] border-[#F5A623]/70" : "border border-white/10"
      } shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-colors hover:border-white/20 ${className}`}
    >
      {children}
    </div>
  );
}

function Badge({ icon, size = "h-9 w-9" }: { icon: React.ReactNode; size?: string }) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A] ${size}`}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,140,60,0.35) 0%, rgba(255,140,60,0) 65%)" }}
      />
      <span className="relative z-10 text-[#F5A623]">{icon}</span>
    </div>
  );
}

const darkInput =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-500 outline-none transition-colors focus-visible:border-[#F5A623]/50 focus-visible:ring-0";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="h-auto gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-zinc-200 shadow-none hover:bg-white/[0.08]"
    >
      {copied ? <FiCheck className="h-3.5 w-3.5 text-[#22C55E]" /> : <FiCopy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Segmented-control toggle, dark theme — active state gets the amber accent. */
function SegmentButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40 ${
        active
          ? "bg-white/[0.08] text-[#F5A623] ring-1 ring-[#F5A623]/30"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

const PLATFORM_OPTIONS: { value: Platform; label: string; icon: React.ReactNode }[] = [
  { value: "linkedin", label: "LinkedIn", icon: <FaLinkedin className="h-3.5 w-3.5" /> },
  { value: "twitter", label: "X / Twitter", icon: <FaXTwitter className="h-3.5 w-3.5" /> },
  { value: "threads", label: "Threads", icon: <FaThreads className="h-3.5 w-3.5" /> },
];

const CONTACT_OPTIONS: { value: ContactPreference; label: string; icon: React.ReactNode }[] = [
  { value: "dm", label: "DM me", icon: <FiMessageCircle className="h-3.5 w-3.5" /> },
  { value: "email", label: "Email me", icon: <FiMail className="h-3.5 w-3.5" /> },
  { value: "comment", label: "Reply in comments", icon: <FiMessageSquare className="h-3.5 w-3.5" /> },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function CommentGeneratorPage() {
  const prefersReduced = useReducedMotion();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [postText, setPostText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  const handleGenerate = async () => {
    if (!postText.trim() || !profile.name.trim() || !profile.niche.trim()) {
      setError("Fill your name, niche, and paste the post first.");
      return;
    }
    if (profile.contactPreference === "email" && !profile.email.trim()) {
      setError("Add your email, or switch to DM / Comment.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, ...profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setResult(data);
      setResultVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ClueFind Reply Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Turns a pasted hiring or lookout post into a human-sounding LinkedIn, X, or Threads reply plus a follow-up DM, matched to your niche and how you want to be contacted.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div id="main-content" className="relative min-h-dvh overflow-hidden bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Starfield + warm amber ambient glow — Magic UI signature background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <Starfield />
        <div
          className="absolute left-1/2 top-[-10%] h-[560px] w-[560px] -translate-x-1/2 opacity-70"
          style={{
            background: "radial-gradient(circle, rgba(255,140,60,0.22) 0%, rgba(255,140,60,0) 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <motion.div
        variants={prefersReduced ? undefined : container}
        initial={prefersReduced ? undefined : "hidden"}
        animate={prefersReduced ? undefined : "show"}
        className="relative mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6"
      >
        <motion.div variants={fadeUp} className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[13px] text-zinc-300">
            <HiSparkles className="h-3.5 w-3.5 text-[#F5A623]" />
            Reply Generator
          </div>
          <h1
            className="text-[36px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[44px]"
            style={{
              background: "linear-gradient(to bottom, #fff 20%, rgba(255,255,255,0.35) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Turn any post into a reply<br />that gets you hired.
          </h1>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-zinc-400">
            Paste a hiring post, get a human-sounding reply and follow-up DM — matched to your niche.
          </p>
        </motion.div>

        {/* Profile card */}
        <motion.div variants={fadeUp}>
          <DarkPanel className="p-4 sm:p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Your profile</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={darkInput}
              />
              <Input
                placeholder="Niche (e.g. video editing)"
                value={profile.niche}
                onChange={(e) => setProfile({ ...profile, niche: e.target.value })}
                className={darkInput}
              />
              <Input
                placeholder="Experience (e.g. 2+ years)"
                value={profile.experience}
                onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                className={darkInput}
              />
              <Input
                placeholder="Link (portfolio / WhatsApp)"
                value={profile.link}
                onChange={(e) => setProfile({ ...profile, link: e.target.value })}
                className={darkInput}
              />
            </div>

            <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Where&apos;s this post?
            </p>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {PLATFORM_OPTIONS.map((opt) => (
                <SegmentButton
                  key={opt.value}
                  active={profile.platform === opt.value}
                  onClick={() => setProfile({ ...profile, platform: opt.value })}
                >
                  {opt.icon}
                  {opt.label}
                </SegmentButton>
              ))}
            </div>

            <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              How should they reach you?
            </p>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {CONTACT_OPTIONS.map((opt) => (
                <SegmentButton
                  key={opt.value}
                  active={profile.contactPreference === opt.value}
                  onClick={() => setProfile({ ...profile, contactPreference: opt.value })}
                >
                  {opt.icon}
                  {opt.label}
                </SegmentButton>
              ))}
            </div>

            {profile.contactPreference === "email" && (
              <Input
                placeholder="your@email.com"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={`${darkInput} mt-3`}
              />
            )}
          </DarkPanel>
        </motion.div>

        {/* Post input card */}
        <motion.div variants={fadeUp}>
          <DarkPanel className="mt-4 p-4 sm:p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Post to reply to
            </p>
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Paste the hiring post / thread text here…"
              rows={6}
              className={`${darkInput} resize-none leading-relaxed`}
            />

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="group relative mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#F5A623]/40 bg-white text-[13px] font-semibold text-black shadow-[0_8px_22px_rgba(245,166,35,0.18)] transition-transform hover:bg-white/90 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-6"
            >
              <HiSparkles className="relative z-10 h-4 w-4 text-[#F5A623]" />
              <span className="relative z-10">{loading ? "Writing…" : "Generate reply"}</span>
            </Button>

            {error && <p className="mt-3 text-[12px] font-medium text-red-400">{error}</p>}
          </DarkPanel>
        </motion.div>

        {/* Results */}
        {result && (
          <motion.div
            key={resultVersion}
            variants={prefersReduced ? undefined : container}
            initial={prefersReduced ? undefined : "hidden"}
            animate={prefersReduced ? undefined : "show"}
            className="mt-4 space-y-4"
          >
            {!result.nicheMatch && (
              <motion.div variants={fadeUp}>
                <DarkPanel className="border-blue-400/25 bg-blue-500/[0.06] p-3.5">
                  <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-blue-300">
                    <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This post wasn&apos;t asking for {profile.niche || "your niche"} specifically — the reply
                    below says so upfront instead of pretending it&apos;s a perfect fit.
                  </p>
                </DarkPanel>
              </motion.div>
            )}

            {(result.contacts.emails.length > 0 || result.contacts.phones.length > 0) && (
              <motion.div variants={fadeUp}>
                <DarkPanel highlight className="p-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#F5A623]">
                    Found in post
                  </p>
                  <div className="space-y-1">
                    {result.contacts.emails.map((e) => (
                      <div key={e} className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                        <FiMail className="h-3.5 w-3.5 shrink-0 text-[#F5A623]" /> {e}
                      </div>
                    ))}
                    {result.contacts.phones.map((p) => (
                      <div key={p} className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                        <FiPhone className="h-3.5 w-3.5 shrink-0 text-[#F5A623]" /> {p}
                      </div>
                    ))}
                  </div>
                </DarkPanel>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <DarkPanel className="p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Reply to post</p>
                  <CopyButton text={result.comment} label="Copy reply" />
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-200">{result.comment}</p>
              </DarkPanel>
            </motion.div>

            <motion.div variants={fadeUp}>
              <DarkPanel className="p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    If they reply — send this
                  </p>
                  <CopyButton text={result.followUpDm} label="Copy DM" />
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-200">
                  {result.followUpDm}
                </p>
              </DarkPanel>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
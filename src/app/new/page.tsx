"use client";

import { useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Search,
  Target,
  Megaphone,
  RefreshCw,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import StatusState, { SkeletonRows } from "@/app/components/Statusstate";

/* Same mapping as the Project Documentation's Time Filter table */
const TIME_FILTERS = [
  { label: "1h", code: "r3600" },
  { label: "2h", code: "r7200" },
  { label: "6h", code: "r21600" },
  { label: "12h", code: "r43200" },
  { label: "24h", code: "r86400" },
  { label: "7d", code: "r604800" },
  { label: "30d", code: "r2592000" },
] as const;

type Tone = "direct" | "hiring" | "looking" | "ai";

type LinkItem = {
  id: string;
  label: string;
  hint: string;
  query: string;
  tone: Tone;
};

const TONE_STYLES: Record<
  Tone,
  { badge: string; icon: typeof Search; dot: string }
> = {
  direct: {
    badge: "bg-blue-50 text-[#2D5BFF]",
    icon: Search,
    dot: "bg-[#2D5BFF]",
  },
  hiring: {
    badge: "bg-emerald-50 text-emerald-600",
    icon: Megaphone,
    dot: "bg-emerald-500",
  },
  looking: {
    badge: "bg-amber-50 text-amber-600",
    icon: Target,
    dot: "bg-amber-500",
  },
  ai: {
    badge: "bg-violet-50 text-violet-600",
    icon: Sparkles,
    dot: "bg-violet-500",
  },
};

const buildUrl = (query: string, code: string) =>
  `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
    query
  )}&sortBy=%22DATE_POSTED%22&datePosted=%5B%22${code}%22%5D`;

/* Instant, deterministic starter set — no AI needed for these three */
const buildTemplateLinks = (keyword: string): LinkItem[] => {
  const k = keyword.trim();
  return [
    {
      id: "direct",
      label: k,
      hint: "Posts that mention this directly",
      query: k,
      tone: "direct",
    },
    {
      id: "hiring",
      label: `Hiring ${k}`,
      hint: "Companies actively hiring — warm leads",
      query: `hiring ${k}`,
      tone: "hiring",
    },
    {
      id: "looking",
      label: `Looking for ${k}`,
      hint: "People actively searching — high intent",
      query: `looking for ${k}`,
      tone: "looking",
    },
  ];
};

function GeneratorPage() {
  const container = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialKeyword = searchParams.get("keyword") ?? "";
  const initialLabel = searchParams.get("filter") ?? "24h";
  const initialFilter =
    TIME_FILTERS.find((f) => f.label === initialLabel) ?? TIME_FILTERS[4];

  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>(
    initialFilter
  );
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [checkingSpelling, setCheckingSpelling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [correctionNotice, setCorrectionNotice] = useState<{
    from: string;
    to: string;
  } | null>(null);

  /* Page entrance */
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".gen-back", { opacity: 0, y: -10, duration: 0.5 })
        .from(".gen-heading", { opacity: 0, y: 24, duration: 0.7 }, "-=0.25")
        .from(
          ".gen-panel",
          { opacity: 0, y: 30, scale: 0.98, duration: 0.7 },
          "-=0.35"
        );
    },
    { scope: container }
  );

  /* Stagger-reveal cards whenever the link list changes */
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced || links.length === 0) return;

      gsap.from(".link-card:not(.link-card-seen)", {
        opacity: 0,
        y: 18,
        scale: 0.97,
        duration: 0.45,
        stagger: 0.08,
        ease: "power3.out",
        onComplete: () => {
          document
            .querySelectorAll(".link-card")
            .forEach((el) => el.classList.add("link-card-seen"));
        },
      });
    },
    { dependencies: [links.length], scope: resultsRef }
  );

  /* Ask the AI to fix typos before we build search links from them.
     Never blocks generation — if this fails for any reason we just
     fall back to whatever the user typed. */
  const correctSpelling = useCallback(
    async (raw: string): Promise<string> => {
      setCheckingSpelling(true);
      setCorrectionNotice(null);
      try {
        const res = await fetch("/api/correct-keyword", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: raw }),
        });
        if (!res.ok) return raw;
        const data = await res.json();
        if (data?.wasCorrected && typeof data.corrected === "string") {
          setCorrectionNotice({ from: raw.trim(), to: data.corrected });
          return data.corrected;
        }
        return raw;
      } catch {
        return raw;
      } finally {
        setCheckingSpelling(false);
      }
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setFormError("Enter a keyword first.");
      return;
    }
    setFormError(null);
    setAiError(null);
    setGenerating(true);

    const finalKeyword = await correctSpelling(trimmed);
    if (finalKeyword !== trimmed) {
      setKeyword(finalKeyword);
    }

    // brief, deliberate pause so the result feels "assembled" rather
    // than snapping in — not a network call, purely perceptual
    window.setTimeout(() => {
      setLinks(buildTemplateLinks(finalKeyword));
      setGenerating(false);
    }, 350);
  }, [keyword, correctSpelling]);

  const handleGenerateMore = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          existing: links.map((l) => l.query),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong.");
      }
      const fresh: LinkItem[] = (data.links ?? [])
        .filter(
          (l: { query: string }) =>
            !links.some(
              (existingLink) =>
                existingLink.query.toLowerCase() === l.query.toLowerCase()
            )
        )
        .map((l: { label: string; query: string; hint: string }, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          label: l.label,
          hint: l.hint,
          query: l.query,
          tone: "ai" as const,
        }));

      if (fresh.length === 0) {
        setAiError("No new ideas came back — try again in a moment.");
      } else {
        setLinks((prev) => [...prev, ...fresh]);
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Couldn't reach the AI service."
      );
    } finally {
      setAiLoading(false);
    }
  }, [keyword, links]);

  const handleCopy = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, []);

  const handleOpen = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <main
      id="main-content"
      ref={container}
      className="liquid-bg relative min-h-screen w-full overflow-hidden px-4 py-12 sm:px-6 sm:py-16"
    >
      {/* Liquid glass background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="liquid-blob liquid-blob-a" />
        <div className="liquid-blob liquid-blob-b" />
        <div className="liquid-blob liquid-blob-c" />
      </div>

      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="gen-back mb-8 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-800 sm:mb-10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>

        <div className="gen-heading mb-8 text-center sm:mb-10">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[34px]">
            Generate your{" "}
            <span className="bg-gradient-to-r from-[#2D5BFF] to-[#F5A524] bg-clip-text text-transparent">
              lead links
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-500 sm:text-[14px]">
            One keyword becomes several angles — people doing it, people
            hiring for it, and people looking for it.
          </p>
        </div>

        <div className="gen-panel liquid-panel rounded-[28px] p-5 sm:p-8">
          {/* Keyword + filter row */}
          <label htmlFor="keyword-input" className="mb-2 block text-[13px] font-semibold text-slate-600">
            Keyword
          </label>
          <div className="relative">
            <input
              id="keyword-input"
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (formError) setFormError(null);
                if (correctionNotice) setCorrectionNotice(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
              placeholder="e.g. flutter developer"
              aria-invalid={!!formError}
              aria-describedby={formError ? "keyword-error" : undefined}
              className={`liquid-input w-full rounded-[16px] px-4 py-3 text-[14px] text-slate-800 outline-none transition-all ${
                formError ? "liquid-input-error" : ""
              }`}
            />
            {checkingSpelling && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {formError && (
            <p
              id="keyword-error"
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-[12px] text-red-500"
            >
              <AlertCircle className="h-3 w-3" />
              {formError}
            </p>
          )}

          {correctionNotice && !formError && (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#2D5BFF]">
              <Wand2 className="h-3 w-3" />
              Fixed spelling: “{correctionNotice.from}” → “
              {correctionNotice.to}”
            </p>
          )}

          <label className="mb-2 mt-5 block text-[13px] font-semibold text-slate-600">
            Freshness
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Freshness filter">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={f.label === filter.label}
                className={`min-h-[36px] rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                  f.label === filter.label
                    ? "liquid-pill-active text-white"
                    : "liquid-pill text-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || checkingSpelling}
            className="liquid-cta mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] py-3 text-[13px] font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {checkingSpelling ? (
              <>
                <Wand2 className="h-4 w-4 animate-pulse" />
                Checking spelling…
              </>
            ) : generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assembling links…
              </>
            ) : (
              <>Generate</>
            )}
          </button>

          {/* Loading state: heading + skeleton, not a skeleton alone */}
          {generating && (
            <div className="mt-6 space-y-3">
              <StatusState
                variant="loading"
                density="compact"
                heading="Assembling your links…"
                description={`Building direct, hiring, and looking-for angles for "${keyword.trim()}"`}
              />
              <SkeletonRows count={3} />
            </div>
          )}

          {/* Results */}
          {!generating && links.length > 0 && (
            <div className="mt-6">
              <div
                ref={resultsRef}
                className="max-h-[420px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
              >
                {links.map((link) => {
                  const url = buildUrl(link.query, filter.code);
                  const tone = TONE_STYLES[link.tone];
                  const Icon = tone.icon;
                  return (
                    <div
                      key={link.id}
                      className="link-card liquid-card rounded-[18px] p-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}
                          >
                            <Icon className="h-3 w-3" />
                            {link.label}
                          </span>
                          <p className="mt-1.5 text-[12px] text-slate-500">
                            {link.hint}
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                            {url}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(link.id, url)}
                            aria-label="Copy link"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpen(url)}
                            aria-label="Open in LinkedIn"
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Generate more (AI) */}
              <button
                type="button"
                onClick={handleGenerateMore}
                disabled={aiLoading}
                className="liquid-dashed mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[16px] py-3 text-[13px] font-semibold text-slate-600 transition-colors hover:text-[#2D5BFF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Finding more angles…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Generate 3 more with AI
                  </>
                )}
              </button>

              {aiError && (
                <div className="mt-3">
                  <StatusState
                    variant="error"
                    density="compact"
                    heading="Couldn't generate more links"
                    description={aiError}
                    onRetry={handleGenerateMore}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .liquid-bg {
          background: linear-gradient(180deg, #eef2ff 0%, #f7f9fc 40%, #fff7ec 100%);
        }
        .liquid-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          opacity: 0.45;
          will-change: transform;
        }
        .liquid-blob-a {
          top: -10%;
          left: -8%;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle at 30% 30%, #2d5bff, transparent 70%);
          animation: liquid-float-a 16s ease-in-out infinite;
        }
        .liquid-blob-b {
          bottom: -12%;
          right: -10%;
          width: 460px;
          height: 460px;
          background: radial-gradient(circle at 60% 40%, #f5a524, transparent 70%);
          animation: liquid-float-b 20s ease-in-out infinite;
        }
        .liquid-blob-c {
          top: 35%;
          right: 20%;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle at 50% 50%, #7c5cff, transparent 70%);
          animation: liquid-float-c 14s ease-in-out infinite;
        }
        @keyframes liquid-float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes liquid-float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.1); }
        }
        @keyframes liquid-float-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 25px) scale(0.92); }
        }
        .liquid-panel {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow:
            0 8px 32px rgba(31, 41, 55, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        .liquid-input {
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.35);
        }
        .liquid-input:focus {
          background: rgba(255, 255, 255, 0.85);
          border-color: #2d5bff;
          box-shadow: 0 0 0 4px rgba(45, 91, 255, 0.12);
        }
        .liquid-input-error {
          border-color: rgba(248, 113, 113, 0.6) !important;
        }
        .liquid-pill {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .liquid-pill:hover {
          background: rgba(255, 255, 255, 0.8);
        }
        .liquid-pill-active {
          background: linear-gradient(135deg, #2d5bff, #4d7bff);
          box-shadow: 0 4px 14px rgba(45, 91, 255, 0.35);
        }
        .liquid-cta {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
        }
        .liquid-cta:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b, #0f172a);
        }
        .liquid-card {
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .liquid-card:hover {
          background: rgba(255, 255, 255, 0.75);
          border-color: rgba(148, 163, 184, 0.4);
          transform: translateY(-1px);
        }
        .liquid-dashed {
          background: rgba(255, 255, 255, 0.4);
          border: 1.5px dashed rgba(148, 163, 184, 0.5);
        }
        .liquid-dashed:hover {
          border-color: #2d5bff;
          background: rgba(255, 255, 255, 0.7);
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-blob-a, .liquid-blob-b, .liquid-blob-c {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

/* useSearchParams needs a Suspense boundary in the App Router */
export default function NewPage() {
  return (
    <Suspense fallback={null}>
      <GeneratorPage />
    </Suspense>
  );
}
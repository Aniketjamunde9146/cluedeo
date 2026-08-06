"use client";

/**
 * /new — Link Generator page
 *
 * Changes from the previous version:
 *  - Swapped GSAP/useGSAP for Framer Motion + a small self-built
 *    IntersectionObserver hook (`useInView`). The rest of the app (Hero)
 *    already runs on Framer Motion, so this removes a second animation
 *    library that was only here for this one page.
 *  - Added a tiny shadcn-style local UI kit (`cn`, `Button`, `Pill`,
 *    `Reveal`) so every interactive element shares one variant system
 *    instead of one-off className strings.
 *  - Added a custom scroll-progress rail (`useScrollProgress`, no library)
 *    matching the glow-rail already used on the About section.
 *  - Fixed real bugs — see inline `// fix:` comments.
 *  - Tightened mobile layout: 16px input font (prevents iOS auto-zoom),
 *    viewport-relative result list height, full-width stacked actions.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuSparkles,
  LuCopy,
  LuCheck,
  LuExternalLink,
  LuLoaderCircle,
  LuSearch,
  LuTarget,
  LuMegaphone,
  LuRefreshCw,
  LuCircleAlert,
  LuWand,
} from "react-icons/lu";
import StatusState, { SkeletonRows } from "@/app/components/Statusstate";

/* ------------------------------------------------------------------ */
/* Local "shadcn-style" primitives — variant-driven, prop-first,       */
/* zero extra deps. Worth lifting into /components/ui/* later if more  */
/* pages start reusing them.                                           */
/* ------------------------------------------------------------------ */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Bare IntersectionObserver hook — our own scroll-reveal trigger,
 *  no scroll library involved. Fires once, then disconnects. */
function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true); // no IO support — just show content
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px", ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

/** Whole-page scroll progress, driven by our own rAF-throttled listener. */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}

function ScrollProgressRail() {
  const progress = useScrollProgress();
  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 z-50 h-[3px] bg-white/[0.06]"
    >
      <div
        className="h-full origin-left"
        style={{
          transform: `scaleX(${progress})`,
          background:
            "linear-gradient(90deg, var(--color-accent-strong), var(--color-accent))",
        }}
      />
    </div>
  );
}

/** Blur/fade/slide-up entrance. `mode="mount"` plays immediately (above
 *  the fold); `mode="scroll"` waits for `useInView`. Respects
 *  prefers-reduced-motion by skipping straight to the final state. */
function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  blur = 6,
  mode = "scroll",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: number;
  mode?: "mount" | "scroll";
}) {
  const prefersReduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = mode === "mount" || inView;

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={show ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type ButtonVariant = "solid" | "outline" | "ghost" | "dashed" | "icon";
type ButtonSize = "sm" | "md" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  solid: "bg-white text-black hover:bg-white/90",
  outline:
    "border border-border text-text-secondary bg-transparent hover:border-border-strong hover:text-text",
  ghost: "text-text-secondary bg-transparent hover:bg-white/10 hover:text-text",
  dashed:
    "border border-dashed border-border-strong bg-white/[0.02] text-text-secondary hover:border-accent hover:bg-white/[0.04] hover:text-accent",
  icon: "text-text-muted bg-transparent hover:bg-white/10 hover:text-text",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[12px] rounded-full",
  md: "min-h-[44px] px-5 text-[13px] rounded-[16px]",
  icon: "h-9 w-9 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "solid", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
});

/** Toggle-style pill, used for the freshness filter row. */
function Pill({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "min-h-[36px] rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/50",
        active
          ? "shadow-[0_4px_14px_rgba(245,166,35,0.35)] text-black"
          : "border border-border bg-white/[0.04] text-text-secondary hover:bg-white/[0.08]"
      )}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, var(--color-accent-strong), var(--color-accent))",
            }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Product data                                                        */
/* ------------------------------------------------------------------ */

const TIME_FILTERS = [
  { label: "1h", code: "r3600" },
  { label: "2h", code: "r7200" },
  { label: "6h", code: "r21600" },
  { label: "12h", code: "r43200" },
  { label: "24h", code: "r86400" },
  { label: "7d", code: "r604800" },
  { label: "30d", code: "r2592000" },
] as const;

const DEFAULT_FILTER_LABEL = "24h";

type Tone = "direct" | "hiring" | "looking" | "ai";

type LinkItem = {
  id: string;
  label: string;
  hint: string;
  query: string;
  tone: Tone;
};

const TONE_STYLES: Record<Tone, { badge: string; icon: IconType }> = {
  direct: { badge: "bg-blue-500/10 text-blue-400", icon: LuSearch },
  hiring: { badge: "bg-emerald-500/10 text-emerald-400", icon: LuMegaphone },
  looking: { badge: "bg-accent-soft text-accent", icon: LuTarget },
  ai: { badge: "bg-violet-500/10 text-violet-400", icon: LuSparkles },
};

const buildUrl = (query: string, code: string) =>
  `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
    query
  )}&sortBy=%22DATE_POSTED%22&datePosted=%5B%22${code}%22%5D`;

const buildTemplateLinks = (keyword: string): LinkItem[] => {
  const k = keyword.trim();
  return [
    { id: "direct", label: k, hint: "Posts that mention this directly", query: k, tone: "direct" },
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

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

function GeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const initialKeyword = (searchParams.get("keyword") ?? "").trim(); // fix: trim URL param
  const initialLabel = searchParams.get("filter") ?? DEFAULT_FILTER_LABEL;
  const initialFilter =
    TIME_FILTERS.find((f) => f.label === initialLabel) ??
    TIME_FILTERS.find((f) => f.label === DEFAULT_FILTER_LABEL) ??
    TIME_FILTERS[0]; // fix: no more hardcoded array index (was TIME_FILTERS[4])

  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>(initialFilter);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [checkingSpelling, setCheckingSpelling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [correctionNotice, setCorrectionNotice] = useState<{ from: string; to: string } | null>(null);

  const mountedRef = useRef(true);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = generating || checkingSpelling; // fix: single source of truth for "can't submit right now"

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // fix: auto-scroll the results panel down when the AI appends more
  // links, so newly added cards aren't hidden below the fold of the
  // scrollable list. Only fires once links grow past the initial 3.
  useEffect(() => {
    if (links.length > 3 && resultsRef.current) {
      const el = resultsRef.current;
      requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
    }
  }, [links.length]);

  const correctSpelling = useCallback(async (raw: string): Promise<string> => {
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
        if (mountedRef.current) setCorrectionNotice({ from: raw.trim(), to: data.corrected });
        return data.corrected;
      }
      return raw;
    } catch {
      return raw;
    } finally {
      if (mountedRef.current) setCheckingSpelling(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (busy) return; // fix: block concurrent submits (e.g. rapid Enter presses)
    const trimmed = keyword.trim();
    if (!trimmed) {
      setFormError("Enter a keyword first.");
      return;
    }
    setFormError(null);
    setAiError(null);
    setGenerating(true);

    const finalKeyword = await correctSpelling(trimmed);
    if (!mountedRef.current) return;
    if (finalKeyword !== trimmed) setKeyword(finalKeyword);

    if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current); // fix: clear any stale timer first
    generateTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setLinks(buildTemplateLinks(finalKeyword));
      setGenerating(false);
    }, 350);
  }, [busy, keyword, correctSpelling]);

  const handleGenerateMore = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed, existing: links.map((l) => l.query) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");

      // fix: dedupe against existing links AND within the same AI batch
      // (previously two near-identical suggestions in one response could
      // both slip through since only `links` was checked).
      const seen = new Set(links.map((l) => l.query.toLowerCase()));
      const fresh: LinkItem[] = [];
      for (const l of (data.links ?? []) as { label: string; query: string; hint: string }[]) {
        const key = l.query.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push({ id: `ai-${Date.now()}-${fresh.length}`, label: l.label, hint: l.hint, query: l.query, tone: "ai" });
      }

      if (!mountedRef.current) return;
      if (fresh.length === 0) {
        setAiError("No new ideas came back — try again in a moment.");
      } else {
        setLinks((prev) => [...prev, ...fresh]);
      }
    } catch (err) {
      if (mountedRef.current) {
        setAiError(err instanceof Error ? err.message : "Couldn't reach the AI service.");
      }
    } finally {
      if (mountedRef.current) setAiLoading(false);
    }
  }, [keyword, links, aiLoading]);

  const handleCopy = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); // fix: avoid an older timer clobbering a newer copy
      setCopiedId(id);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) setCopiedId((c) => (c === id ? null : c));
      }, 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, []);

  const handleOpen = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ClueFind Link Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Turn a keyword into direct, hiring, and looking-for LinkedIn search links, filtered by freshness.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main
      id="main-content"
      className="relative min-h-screen w-full overflow-hidden bg-bg px-4 py-10 sm:px-6 sm:py-16"
    >
      <ScrollProgressRail />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="gen-blob gen-blob-a" />
        <div className="gen-blob gen-blob-b" />
      </div>
      <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10 opacity-[0.03] mix-blend-overlay" />

      <div className="mx-auto w-full max-w-2xl">
        <Reveal mode="mount">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="mb-8 !px-0 !justify-start gap-1.5 text-text-secondary sm:mb-10"
          >
            <LuArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Button>
        </Reveal>

        <Reveal mode="mount" delay={0.08}>
          <div className="mb-8 text-center sm:mb-10">
            <h1 className="font-heading text-[26px] font-bold tracking-tight text-text sm:text-[34px]">
              Generate your{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--color-accent-strong), var(--color-accent))",
                }}
              >
                lead links
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-text-secondary sm:text-[14px]">
              One keyword becomes several angles — people doing it, people
              hiring for it, and people looking for it.
            </p>
          </div>
        </Reveal>

        <Reveal mode="mount" delay={0.16} y={24} blur={8}>
          <div className="liquid-panel rounded-[24px] p-5 sm:rounded-[28px] sm:p-8">
            <label htmlFor="keyword-input" className="mb-2 block text-[13px] font-semibold text-text-secondary">
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
                  if (e.key === "Enter" && !busy) handleGenerate(); // fix: Enter now respects the busy state
                }}
                placeholder="e.g. flutter developer"
                aria-invalid={!!formError}
                aria-describedby={formError ? "keyword-error" : undefined}
                autoComplete="off"
                className={cn(
                  // fix: 16px base font on mobile prevents iOS Safari's
                  // auto-zoom-on-focus for inputs under 16px.
                  "liquid-input w-full rounded-[16px] px-4 py-3 text-base text-text outline-none transition-all sm:text-[14px]",
                  "focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/40",
                  formError && "liquid-input-error"
                )}
              />
              {checkingSpelling && (
                <LuLoaderCircle className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
              )}
            </div>

            {formError && (
              <p id="keyword-error" role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-red-400">
                <LuCircleAlert className="h-3 w-3" />
                {formError}
              </p>
            )}

            {correctionNotice && !formError && (
              <p className="mt-1.5 flex items-center gap-1 text-[12px] text-accent">
                <LuWand className="h-3 w-3" />
                Fixed spelling: “{correctionNotice.from}” → “{correctionNotice.to}”
              </p>
            )}

            <label className="mb-2 mt-5 block text-[13px] font-semibold text-text-secondary">Freshness</label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Freshness filter">
              {TIME_FILTERS.map((f) => (
                <Pill key={f.label} active={f.label === filter.label} onClick={() => setFilter(f)}>
                  {f.label}
                </Pill>
              ))}
            </div>

            <Button
              type="button"
              variant="solid"
              onClick={handleGenerate}
              disabled={busy}
              className="mt-6 w-full"
            >
              {checkingSpelling ? (
                <>
                  <LuWand className="h-4 w-4 animate-pulse" />
                  Checking spelling…
                </>
              ) : generating ? (
                <>
                  <LuLoaderCircle className="h-4 w-4 animate-spin" />
                  Assembling links…
                </>
              ) : (
                <>Generate</>
              )}
            </Button>

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

            {!generating && links.length > 0 && (
              <div className="mt-6">
                <div
                  ref={resultsRef}
                  className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[420px] [scrollbar-width:thin]"
                >
                  {links.map((link, i) => {
                    const url = buildUrl(link.query, filter.code);
                    const tone = TONE_STYLES[link.tone];
                    const Icon = tone.icon;
                    return (
                      <Reveal key={link.id} mode="scroll" delay={Math.min(i, 4) * 0.06} y={12} blur={4}>
                        <div className="liquid-card rounded-[18px] p-4 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  tone.badge
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {link.label}
                              </span>
                              <p className="mt-1.5 text-[12px] text-text-secondary">{link.hint}</p>
                              <p className="mt-1 truncate font-mono text-[11px] text-text-muted">{url}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                type="button"
                                variant="icon"
                                size="icon"
                                onClick={() => handleCopy(link.id, url)}
                                aria-label="Copy link"
                              >
                                {copiedId === link.id ? (
                                  <LuCheck className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <LuCopy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="solid"
                                size="icon"
                                onClick={() => handleOpen(url)}
                                aria-label="Open in LinkedIn"
                              >
                                <LuExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="dashed"
                  onClick={handleGenerateMore}
                  disabled={aiLoading}
                  className="mt-4 w-full"
                >
                  {aiLoading ? (
                    <>
                      <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Finding more angles…
                    </>
                  ) : (
                    <>
                      <LuRefreshCw className="h-3.5 w-3.5" />
                      Generate 3 more with AI
                    </>
                  )}
                </Button>

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
        </Reveal>
      </div>

      <style jsx>{`
        .gen-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.35;
          will-change: transform;
        }
        .gen-blob-a {
          top: -10%;
          left: -8%;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle at 30% 30%, var(--color-accent-strong), transparent 70%);
          animation: gen-float-a 16s ease-in-out infinite;
        }
        .gen-blob-b {
          bottom: -12%;
          right: -10%;
          width: 460px;
          height: 460px;
          background: radial-gradient(circle at 60% 40%, var(--color-accent), transparent 70%);
          animation: gen-float-b 20s ease-in-out infinite;
        }
        @keyframes gen-float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes gen-float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.1); }
        }
        .liquid-panel {
          background: color-mix(in srgb, var(--color-surface) 78%, transparent);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid var(--color-border);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .liquid-input {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--color-border);
        }
        .liquid-input::placeholder {
          color: var(--color-text-muted);
        }
        .liquid-input:focus {
          background: rgba(0, 0, 0, 0.5);
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px var(--color-accent-soft);
        }
        .liquid-input-error {
          border-color: rgba(248, 113, 113, 0.6) !important;
        }
        .liquid-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--color-border);
        }
        .liquid-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--color-border-strong);
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .gen-blob-a, .gen-blob-b {
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
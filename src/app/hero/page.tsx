"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { HiSparkles } from "react-icons/hi2";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiPlayCircle,
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiZap,
} from "react-icons/fi";
// Navbar is NOT rendered here — it lives once in app/layout.tsx so it's
// shared across every route instead of being mounted per-page (that
// double-mount was exactly what caused the duplicate bars in the screenshot).

/* keyword -> freshness filter -> LinkedIn datePosted code.
   This is ClueFind's real product logic — just reskinned. */
const DEMOS = [
  { keyword: "flutter developer", label: "2h", code: "r7200" },
  { keyword: "shopify agency", label: "24h", code: "r86400" },
  { keyword: "b2b saas founder", label: "7d", code: "r604800" },
];

const FILTERS = ["1h", "2h", "6h", "12h", "24h", "7d", "30d"];
const CYCLE_MS = 3200;

const buildUrl = (keyword: string, code: string) =>
  `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
    keyword
  )}&datePosted=%22${code}%22`;

/* ------------------------------------------------------------------ */
/* Starfield — lightweight 2D canvas particle field (no WebGL, no      */
/* three.js). Cheap on CPU/GPU and on bundle size, which is the whole  */
/* point when the ask is "make the site load fast". Density scales    */
/* down on small screens, twinkle pauses on hidden tabs and respects  */
/* prefers-reduced-motion (renders one still frame instead).           */
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
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; r: number; phase: number; speed: number };
    let stars: Star[] = [];

    const buildStars = () => {
      const isMobile = width < 768;
      const density = isMobile ? 0.00012 : 0.00018; // stars per px^2, tuned for perf
      const count = Math.min(Math.round(width * height * density), isMobile ? 90 : 180);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let t = 0;
    let alive = true;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        const twinkle = prefersReduced
          ? 0.6
          : 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fill();
      }
    };

    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (document.hidden) return; // no work on hidden tabs
      t += 0.02;
      drawFrame();
    };

    if (prefersReduced) {
      drawFrame(); // one still frame, no animation loop at all
    } else {
      tick();
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [prefersReduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-90 [mask-image:radial-gradient(ellipse_70%_65%_at_50%_32%,black,transparent)]"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Motion variants                                                     */
/* ------------------------------------------------------------------ */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    // cast the easing array to any to satisfy framer-motion's TypeScript types
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any },
  },
};

export default function HeroPage() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const demo = DEMOS[index];
  const url = buildUrl(demo.keyword, demo.code);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, [url]);

  const handleOpen = useCallback(() => {
    const params = new URLSearchParams({ keyword: demo.keyword, filter: demo.label });
    router.push(`/new?${params.toString()}`);
  }, [router, demo]);

  const handleGetStarted = useCallback(() => router.push("/new"), [router]);
  const scrollToMockup = useCallback(() => {
    document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* Auto-cycle demos — paused on hover/focus and hidden tabs (WCAG 2.2.2) */
  useEffect(() => {
    if (prefersReduced || paused) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % DEMOS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused, prefersReduced]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div id="hero" className="relative min-h-screen w-full overflow-hidden bg-bg">
      {/* Warm amber ambient glow — the Magic UI signature, sits behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-18%] h-[560px] w-[900px] -translate-x-1/2 rounded-full blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,140,60,0.22) 0%, rgba(255,140,60,0.10) 45%, transparent 75%)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-6%] h-[420px] w-[420px] rounded-full blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,166,35,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      <Starfield />

      <div aria-hidden className="grain pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay" />

      {/* Hero content */}
      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex flex-col items-center px-6 pb-16 pt-32 text-center sm:pt-36"
      >
        <motion.div
          variants={fadeUp}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.06] px-4 py-1.5 text-[13px] text-text-secondary"
        >
          <FiZap className="h-3.5 w-3.5 text-accent" />
          Introducing AI-suggested keywords
          <FiArrowUpRight className="h-3.5 w-3.5" />
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="headline-fade max-w-3xl font-heading text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[58px] lg:text-[68px]"
        >
          EVERY POST
          <br />
          IS A CLUE.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-lg text-[15px] leading-relaxed text-text-secondary sm:text-[16px]"
        >
          ClueFind turns a keyword into an optimized lead-search URL —
          sharpened by AI suggestions, filtered by exactly how fresh you want it.
        </motion.p>

        {/* Product mockup — the self-assembling search URL builder */}
        <motion.div
          id="builder"
          variants={fadeUp}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(document.hidden)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setPaused(document.hidden);
            }
          }}
          className="relative mt-11 w-full max-w-xl scroll-mt-24 [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)]"
        >
          <div className="absolute -inset-3 -z-10 rounded-[32px] bg-gradient-to-r from-accent/10 via-accent/5 to-transparent blur-2xl" />
          <div className="rounded-[20px] border border-border bg-surface p-5 text-left shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="case-tag text-[10px] text-text-muted">keyword</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={demo.keyword}
                    initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="truncate font-mono text-[14px] font-medium text-text"
                  >
                    {demo.keyword}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold text-accent">
                <HiSparkles className="h-3 w-3" />
                AI suggested
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
              {FILTERS.map((f) => (
                <span
                  key={f}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 ${
                    f === demo.label
                      ? "bg-accent text-black"
                      : "bg-white/[0.06] text-text-muted"
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-border bg-black/40 px-3.5 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text-muted">
                linkedin.com/search/results/content/?keywords=
                <AnimatePresence mode="wait">
                  <motion.span
                    key={demo.keyword + "-url"}
                    initial={{ opacity: 0, filter: "blur(3px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(3px)" }}
                    transition={{ duration: 0.35 }}
                    className="font-semibold text-accent"
                  >
                    {demo.keyword.replace(/ /g, "%20")}
                  </motion.span>
                </AnimatePresence>
                &amp;datePosted=
                <AnimatePresence mode="wait">
                  <motion.span
                    key={demo.code}
                    initial={{ opacity: 0, filter: "blur(3px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(3px)" }}
                    transition={{ duration: 0.35 }}
                    className="font-semibold text-amber-400"
                  >
                    {demo.code}
                  </motion.span>
                </AnimatePresence>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy URL"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/10 hover:text-text"
              >
                {copied ? (
                  <FiCheck className="h-3.5 w-3.5 text-success" />
                ) : (
                  <FiCopy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Example keywords">
              {DEMOS.map((d, i) => (
                <button
                  key={d.keyword}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show example: ${d.keyword}`}
                  onClick={() => setIndex(i)}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index ? "w-5 bg-accent" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpen}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-white py-2.5 text-[13px] font-semibold text-black transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
            >
              Generate my own
              <FiArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleGetStarted}
            className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,255,255,0.18)] active:scale-95"
          >
            Get started for free
            <FiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={scrollToMockup}
            className="group flex items-center gap-2 rounded-full border border-border px-6 py-3 text-[14px] font-semibold text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:text-text"
          >
            <FiPlayCircle className="h-4 w-4 text-text-muted transition-colors group-hover:text-text" />
            See how it works
          </button>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-5 text-[13px] font-medium text-text-muted">
          No scraping. No automation. Just smarter search.
        </motion.p>
      </motion.main>

      {/* Glowing trail divider — marks the end of the hero */}
      <div className="relative z-10 mx-auto max-w-4xl px-10">
        <div className="glow-divider" />
      </div>

      <motion.button
        type="button"
        onClick={scrollToMockup}
        aria-label="Scroll to the search builder"
        animate={prefersReduced ? {} : { y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 mx-auto mt-6 mb-10 flex flex-col items-center gap-1 text-text-muted transition-colors hover:text-text"
      >
        <span className="case-tag text-[10px]">Scroll</span>
        <FiChevronDown className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
"use client";

import { useRef } from "react";
import {
  Sparkles,
  Search,
  ShieldCheck,
  Clock,
  Globe,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* Register once at module level */
gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Real product facts pulled from the Leadly spec */
const PILLARS = [
  {
    icon: Search,
    title: "Keyword → URL, instantly",
    body: "Type a keyword and Leadly assembles an optimized LinkedIn search URL — no manual filter juggling, no guesswork.",
  },
  {
    icon: Sparkles,
    title: "Sharpened by AI",
    body: "Groq-powered suggestions expand a single idea into the exact keywords that surface the right people and posts.",
  },
  {
    icon: Clock,
    title: "Filtered by freshness",
    body: "Seven time windows from 1 hour to 30 days, so you only ever see leads that are actually recent.",
  },
  {
    icon: ShieldCheck,
    title: "No scraping. No automation.",
    body: "Leadly only generates search links to public content. Your account stays safe and fully within platform terms.",
  },
];

const STATS = [
  { value: "7", label: "Time filters" },
  { value: "<1s", label: "To generate" },
  { value: "0", label: "Lines scraped" },
];

export default function About() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      /* Scroll-progress rail along the top of the section — always on,
         it's a positional cue rather than motion, so it's fine even
         under reduced-motion. */
      gsap.to(".about-progress-fill", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.3,
        },
      });

      if (reduced) return;

      /* Eyebrow */
      gsap.from(".about-badge", {
        opacity: 0,
        y: 14,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: ".about-head", start: "top 78%" },
      });

      /* Headline — clip-path slide reveal, left to right */
      gsap.fromTo(
        ".about-headline",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1,
          ease: "power4.inOut",
          scrollTrigger: { trigger: ".about-head", start: "top 75%" },
        }
      );

      /* Story paragraph — line-by-line slide up */
      gsap.from(".about-story p", {
        opacity: 0,
        y: 22,
        duration: 0.65,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".about-story", start: "top 80%" },
      });

      /* Pillar cards — each one settles in with a slight 3D tilt, then its
         icon badge pops a beat later so the card doesn't read as one flat
         block landing at once. */
      gsap.utils.toArray<HTMLElement>(".about-card").forEach((card, i) => {
        const fromLeft = i % 2 === 0;
        const icon = card.querySelector(".about-card-icon");

        const tl = gsap.timeline({
          scrollTrigger: { trigger: ".about-grid", start: "top 85%" },
          delay: i * 0.08,
        });

        tl.from(card, {
          opacity: 0,
          y: 28,
          x: fromLeft ? -36 : 36,
          rotateY: fromLeft ? -10 : 10,
          duration: 0.7,
          ease: "power3.out",
        });

        if (icon) {
          tl.from(
            icon,
            {
              scale: 0.4,
              rotate: -25,
              opacity: 0,
              duration: 0.45,
              ease: "back.out(2.4)",
            },
            "-=0.35"
          );
        }
      });

      /* Stats — pop in with a slide-up */
      gsap.from(".about-stat", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)",
        scrollTrigger: { trigger: ".about-stats", start: "top 85%" },
      });

      /* Ambient blob drift (matches hero) */
      gsap.to(".about-blob", {
        x: 30,
        y: -24,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: container }
  );

  /* Lightweight pointer-tilt on the pillar cards, plus a matching
     counter-tilt + slight lift on the icon so it reads as sitting just
     above the card surface rather than printed flat on it. */
  const handleCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const icon = card.querySelector(".about-card-icon");
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(card, {
      rotateX: py * -6,
      rotateY: px * 6,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 600,
    });

    if (icon) {
      gsap.to(icon, {
        x: px * 8,
        y: py * 8,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const icon = card.querySelector(".about-card-icon");
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.5,
      ease: "power3.out",
    });
    if (icon) {
      gsap.to(icon, { x: 0, y: 0, duration: 0.5, ease: "power3.out" });
    }
  };

  return (
    <section
      ref={container}
      id="about"
      className="relative w-full overflow-hidden bg-[#F7F9FC] py-20 sm:py-28"
    >
      {/* Scroll-progress rail */}
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-slate-200/70">
        <div className="about-progress-fill h-full origin-left scale-x-0 bg-gradient-to-r from-[#2D5BFF] to-[#F5A524]" />
      </div>

      {/* Decorative blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="about-blob absolute right-[-10%] top-[-8%] h-[520px] w-[520px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(45,91,255,0.12) 0%, rgba(45,91,255,0) 70%)",
          }}
        />
        <div
          className="about-blob absolute bottom-[-14%] left-[-6%] h-[440px] w-[440px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,165,36,0.10) 0%, rgba(245,165,36,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="about-head mx-auto max-w-2xl text-center">
          <div className="about-badge mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <Globe className="h-3.5 w-3.5 text-[#2D5BFF]" />
            <span className="text-[13px] font-semibold tracking-wide text-slate-600">
              About Leadly
            </span>
          </div>

          <h2 className="about-headline text-[30px] font-extrabold leading-[1.18] tracking-tight text-slate-900 sm:text-[42px]">
            Built to make lead discovery{" "}
            <span className="relative inline-block bg-gradient-to-r from-[#2D5BFF] to-[#F5A524] bg-clip-text text-transparent">
              effortless.
            </span>
          </h2>
        </div>

        {/* Story */}
        <div className="about-story mx-auto mt-6 max-w-2xl space-y-3.5 text-center text-[15px] leading-relaxed text-slate-500">
          <p>
            Finding fresh leads on LinkedIn shouldn&apos;t mean endlessly
            retyping keywords and flipping time filters. That repetition is the
            problem Leadly was built to erase.
          </p>
          <p>
            We turn a single keyword into an optimized LinkedIn search URL —
            enhanced with AI keyword suggestions and filtered by exactly how
            fresh you want the results. One click, and you&apos;re looking at the
            right people at the right moment.
          </p>
          <p>
            Leadly is made for freelancers, agencies, recruiters, and founders
            who&apos;d rather spend their time closing than searching — all
            without scraping or automating a single thing.
          </p>
        </div>

        {/* Pillar cards — one row on desktop, tighter cards instead of two
            wide, gappy columns */}
        <div className="about-grid mt-12 grid grid-cols-1 gap-5 [perspective:1000px] sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                onMouseMove={handleCardMove}
                onMouseLeave={handleCardLeave}
                className="about-card group relative overflow-hidden rounded-[20px] border border-white bg-white/80 p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-md transition-shadow duration-300 will-change-transform hover:shadow-[0_16px_44px_rgba(0,0,0,0.08)]"
              >
                {/* hover glow */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-blue-200/40 to-amber-200/30 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                {/* Liquid-glass icon badge: a diagonal top-left → bottom-right
                    gradient base, a soft white highlight pooled toward the
                    top-left corner (like light catching the surface of a
                    droplet), a darker pool toward the bottom-right for
                    depth, and a shine that sweeps across on hover. */}
                <div className="about-card-icon relative mb-3.5 inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] shadow-[0_6px_16px_rgba(45,91,255,0.28)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4E74FF] via-[#2D5BFF] to-[#162E80]" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 22% 20%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 55%)",
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 80% 85%, rgba(11,22,66,0.55) 0%, rgba(11,22,66,0) 60%)",
                    }}
                  />
                  <div className="pointer-events-none absolute -inset-y-6 -left-1/2 w-1/3 -rotate-12 bg-white/50 opacity-0 blur-sm transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-80" />
                  <Icon className="relative z-10 h-5 w-5 text-white drop-shadow-sm" />
                </div>

                <h3 className="text-[15.5px] font-bold leading-snug text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        
      </div>
    </section>
  );
}
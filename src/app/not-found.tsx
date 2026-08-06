// app/not-found.tsx
"use client";

import Link from "next/link";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

export default function NotFound() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg px-6">
      {/* Warm amber ambient glow — same signature as Hero */}
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

      <div aria-hidden className="grain pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.06] px-4 py-1.5 text-[13px] text-text-secondary">
          <FiSearch className="h-3.5 w-3.5 text-accent" />
          404 — page not found
        </span>

        <h1 className="headline-fade mt-6 max-w-md font-heading text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[46px]">
          THIS PAGE ISN&apos;T
          <br />
          ON THE MAP.
        </h1>

        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Let&apos;s get you back to finding clients.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,255,255,0.18)] active:scale-95"
          >
            <FiArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <Link
            href="/new"
            className="group flex items-center gap-2 rounded-full border border-border px-6 py-3 text-[14px] font-semibold text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:text-text"
          >
            <HiSparkles className="h-3.5 w-3.5 text-accent" />
            Generate a search
          </Link>
        </div>
      </div>

      {/* Glowing trail divider — same as Hero's section end */}
      <div className="absolute bottom-10 left-1/2 z-10 w-full max-w-4xl -translate-x-1/2 px-10">
        <div className="glow-divider" />
      </div>
    </section>
  );
}
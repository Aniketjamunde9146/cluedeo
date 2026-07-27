// app/not-found.tsx
"use client";

import Link from "next/link";
import { FiArrowLeft, FiSearch } from "react-icons/fi";

export default function NotFound() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F7F9FC] px-6">
      {/* Decorative gradient blobs — matches Hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-12%] h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(45,91,255,0.18) 0%, rgba(45,91,255,0.10) 45%, rgba(255,255,255,0) 75%)",
          }}
        />
        <div
          className="absolute bottom-[-16%] right-[-8%] h-[480px] w-[480px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,165,36,0.14) 0%, rgba(245,165,36,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
          <FiSearch className="h-3 w-3" />
          404
        </span>

        <h1 className="mt-5 max-w-md text-[32px] font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-[42px]">
          THIS PAGE ISN&apos;T{" "}
          <span className="bg-gradient-to-r from-[#2D5BFF] to-[#F5A524] bg-clip-text text-transparent">
            ON THE MAP.
          </span>
        </h1>

        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back to finding clients.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2D5BFF] to-[#1B3FCF] bg-[length:200%_100%] bg-[position:0%_0%] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(45,91,255,0.3)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-[position:100%_0%] hover:shadow-[0_14px_36px_rgba(45,91,255,0.42)] active:scale-95"
          >
            <FiArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <Link
            href="/new"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-6 py-3 text-[14px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            Generate a search
          </Link>
        </div>
      </div>
    </section>
  );
}
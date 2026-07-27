"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

// `href` starting with "#" is an in-page section anchor and gets tracked
// by the scroll-spy IntersectionObserver below. Anything else (e.g. "/chat")
// is treated as a real route: it navigates via Next's <Link>, is never
// passed to document.querySelector, and is just never "active" from scroll.
const LINKS = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "AI Guide", href: "/chat" },
];

const isSectionLink = (href: string) => href.startsWith("#");

/**
 * Liquid-glass floating navbar.
 *
 * - Pill-shaped, floating off the top of the viewport (not full-bleed),
 *   with a frosted-glass surface: layered blur + a soft inner highlight
 *   at the top edge to fake a specular glass rim.
 * - The active link is tracked by a "liquid" indicator pill that measures
 *   the active <a>'s bounding box and morphs/slides to it with GSAP,
 *   instead of a static underline. Falls back to an instant jump under
 *   prefers-reduced-motion.
 * - Mobile menu becomes its own separate rounded glass card that drops
 *   below the pill, rather than a squared-off panel attached to the bar.
 * - Accessibility preserved: skip link (on the page shell), focus trap,
 *   Escape to close, 44px touch targets, aria-current / aria-expanded.
 */
export default function Navbar() {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInnerRef = useRef<HTMLUListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("#hero");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which section is in view so the nav can show "you are here".
  // Only ever queries "#"-prefixed hrefs — route links like "/chat" aren't
  // valid CSS selectors and would throw on document.querySelector.
  useEffect(() => {
    const sections = LINKS.filter((l) => isSectionLink(l.href))
      .map((l) => document.querySelector(l.href))
      .filter((el): el is Element => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Liquid indicator: morph the glass pill to sit behind the active link.
  useGSAP(
    () => {
      const el = linkRefs.current[active];
      const list = navListRef.current;
      const indicator = indicatorRef.current;
      if (!el || !list || !indicator) return;

      const listBox = list.getBoundingClientRect();
      const linkBox = el.getBoundingClientRect();
      const x = linkBox.left - listBox.left;
      const width = linkBox.width;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduced) {
        gsap.set(indicator, { x, width, opacity: 1 });
        return;
      }

      gsap.to(indicator, {
        x,
        width,
        opacity: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.75)",
      });
    },
    { dependencies: [active], scope: headerRef }
  );

  // GSAP-driven open/close of the mobile panel.
  useGSAP(
    () => {
      const panel = panelRef.current;
      const items = panelInnerRef.current?.querySelectorAll(".mobile-nav-item");
      if (!panel) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduced) {
        gsap.set(panel, {
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
          display: open ? "block" : "none",
        });
        return;
      }

      gsap.killTweensOf(panel);

      if (open) {
        gsap.set(panel, { display: "block" });
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0, scale: 0.96 },
          {
            height: "auto",
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "power3.out",
          }
        );
        if (items && items.length) {
          gsap.fromTo(
            items,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.3,
              stagger: 0.05,
              delay: 0.1,
              ease: "power3.out",
            }
          );
        }
      } else {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          scale: 0.96,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => gsap.set(panel, { display: "none" }),
        });
      }
    },
    { dependencies: [open], scope: headerRef }
  );

  // Lock body scroll + trap focus while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])"
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleGetStarted = () => {
    setOpen(false);
    router.push("/new");
  };

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      {/* The glass pill itself */}
      <nav
        aria-label="Primary"
        className={`relative flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-white/60 px-4 py-2.5 backdrop-blur-xl transition-shadow duration-300 ${
          scrolled
            ? "bg-white/75 shadow-[0_8px_32px_rgba(16,22,43,0.12)]"
            : "bg-white/55 shadow-[0_4px_20px_rgba(16,22,43,0.06)]"
        }`}
        style={{
          // Specular highlight along the top rim — the "glass" cue.
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        <a
  href="/"
  onClick={() => setOpen(false)}
  className="flex shrink-0 items-center gap-2 pl-2 font-heading text-lg  tracking-tight text-black"
>
  ClueFind
  <span className="signal-dot" />
</a>


        {/* Desktop links, with a liquid indicator pill behind the active one */}
        <ul
          ref={navListRef}
          className="relative hidden items-center gap-1 md:flex"
        >
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-[#2D5BFF]/[0.08] opacity-0"
            style={{ boxShadow: "inset 0 0 0 1px rgba(45,91,255,0.14)" }}
          />
          {LINKS.map((link) => {
            const isActive = active === link.href;
            const isSection = isSectionLink(link.href);
            return (
              <li key={link.href} className="relative z-10">
                {isSection ? (
                  <a
                    href={link.href}
                    ref={(el) => {
                      linkRefs.current[link.href] = el;
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-[#2D5BFF]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    ref={(el) => {
                      linkRefs.current[link.href] = el;
                    }}
                    className="block rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={handleGetStarted}
          className="group hidden shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2D5BFF] to-[#1B3FCF] bg-[length:200%_100%] bg-[position:0%_0%] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(45,91,255,0.3)] transition-all duration-500 ease-out hover:bg-[position:100%_0%] hover:shadow-[0_10px_28px_rgba(45,91,255,0.4)] active:scale-95 md:inline-flex"
        >
          Get started free
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>

        {/* Mobile toggle — 44px min touch target */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-700 md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {/* Mobile menu — its own separate floating glass card, not attached to the pill */}
      <div
        id="mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        style={{ height: 0, opacity: 0, overflow: "hidden", display: "none" }}
        className="absolute left-4 right-4 top-[calc(100%+0.5rem)] rounded-3xl border border-white/60 bg-white/85 shadow-[0_16px_40px_rgba(16,22,43,0.16)] backdrop-blur-xl md:hidden"
      >
        <ul ref={panelInnerRef} className="flex flex-col gap-1 px-4 py-4">
          {LINKS.map((link) => {
            const isActive = active === link.href;
            const isSection = isSectionLink(link.href);
            return (
              <li key={link.href} className="mobile-nav-item">
                {isSection ? (
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-[44px] items-center rounded-2xl px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-50 text-[#2D5BFF]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-2xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            );
          })}
          <li className="mobile-nav-item">
            <button
              type="button"
              onClick={handleGetStarted}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2D5BFF] to-[#1B3FCF] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(45,91,255,0.3)]"
            >
              Get started free
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
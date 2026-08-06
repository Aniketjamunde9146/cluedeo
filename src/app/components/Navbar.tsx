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
  { label: "Reply Generator", href: "/leads/comment-generator" },
];

const isSectionLink = (href: string) => href.startsWith("#");

/**
 * Liquid-glass floating navbar — Magic UI edition.
 *
 * - 12px-rounded glass pill, floating off the top of the viewport, dark
 *   frosted surface (blur + a faint white top rim) instead of the old
 *   light/blue glass.
 * - Sits at full size at the top of the page; once the user scrolls it
 *   shrinks slightly (tighter padding, narrower max-width, subtle scale)
 *   so it reads as "out of the way" without disappearing.
 * - Active link is tracked by a liquid amber indicator pill that measures
 *   the active <a>'s bounding box and morphs/slides to it with GSAP,
 *   falling back to an instant jump under prefers-reduced-motion.
 * - Mobile menu is its own separate rounded glass card that drops below
 *   the pill. Accessibility preserved: focus trap, Escape to close,
 *   44px touch targets, aria-current / aria-expanded.
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
    const onScroll = () => setScrolled(window.scrollY > 24);
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
    { dependencies: [active, scrolled], scope: headerRef }
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
      className={`fixed inset-x-0 top-0 z-50 flex justify-center transition-[padding] duration-500 ease-out ${
        scrolled ? "px-4 pt-4" : "px-0 pt-0"
      }`}
    >
      {/* Fully transparent + full width at the top — reads as part of the
          hero section itself, not a separate bar. Gains a glass surface
          only once you scroll and it needs to stand on its own. */}
      <nav
        aria-label="Primary"
        style={{
          maxWidth: scrolled ? "48rem" : "100%",
          borderRadius: scrolled ? "12px" : "0px",
          boxShadow: scrolled
            ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55)"
            : "none",
        }}
        className={`relative flex w-full items-center justify-between gap-4 transition-all duration-500 ease-out ${
          scrolled
            ? "scale-[0.97] border border-border bg-black/60 px-4 py-2.5 backdrop-blur-xl"
            : "scale-100 border-0 bg-transparent px-6 py-4 backdrop-blur-none"
        }`}
      >
        <a
          href="/"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2 pl-2 font-heading text-[15px] font-bold tracking-tight text-text"
        >
          ClueFind
          <span className="signal-dot" />
        </a>

        {/* Desktop links, with a liquid amber indicator pill behind the active one */}
        <ul
          ref={navListRef}
          className="relative hidden items-center gap-1 md:flex"
        >
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-full rounded-lg bg-accent-soft opacity-0"
            style={{ boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.25)" }}
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
                    className={`block rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-accent"
                        : "text-text-secondary hover:text-text"
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
                    className="block rounded-lg px-4 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text"
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
          className="group hidden shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 py-2 text-[13px] font-semibold text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 active:scale-95 md:inline-flex"
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white/5 text-text md:hidden"
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
        className="absolute left-4 right-4 top-[calc(100%+0.5rem)] rounded-xl border border-border bg-black/85 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl md:hidden"
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
                    className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-text-secondary hover:bg-white/5 hover:text-text"
                    }`}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-white/5 hover:text-text"
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
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
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
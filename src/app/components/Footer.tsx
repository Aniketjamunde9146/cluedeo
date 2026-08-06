import { FiMail, FiGlobe } from "react-icons/fi";
import { FaLinkedin, FaInstagram } from "react-icons/fa6";

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Generate Links", href: "/new" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
];

// Single source of truth for the developer's social/contact links —
// update here if any of these ever change.
const DEV_NAME = "Aniket Jamunde";
const DEV_WEBSITE = "https://aniketwebdev.in";
const DEV_WEBSITE_LABEL = "aniketwebdev.in";
const DEV_INSTAGRAM = "https://instagram.com/aniket_jamunde_002";
const DEV_LINKEDIN = "https://www.linkedin.com/in/aniket-jamunde-6751163ab/";
const DEV_EMAIL = "aniketjamunde4@gmail.com";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-bg">
      {/* faint echo of the hero's amber glow, kept very subtle here */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-accent-strong) 45%, var(--color-accent) 65%, transparent)",
          opacity: 0.5,
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-text">
              ClueFind
              <span className="signal-dot" />
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-text-secondary">
              ClueFind turns a keyword into an optimized LinkedIn search URL —
              sharpened by AI suggestions, filtered by exactly how fresh you
              want it. No scraping. No automation. Just smarter search.
            </p>
          </div>

          <div>
            <h3 className="case-tag text-[11px] text-text">Navigate</h3>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] text-text-secondary transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="case-tag text-[11px] text-text">Legal</h3>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] text-text-secondary transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="my-10 h-px w-full bg-border" aria-hidden="true" />

        {/* Bottom row — copyright + dev credit on the left, social icons on
            the right. Stacks (icons on top) on mobile. */}
        <div className="flex flex-col-reverse items-center justify-between gap-6 border-t border-border pt-6 text-[12px] text-text-muted md:flex-row md:items-end">
          <div className="flex flex-col items-center gap-1.5 text-center md:items-start md:text-left">
            <p>© {year} ClueFind. All rights reserved.</p>
            <p className="text-[11px]">
              Designed &amp; built by{" "}
              <a
                href={DEV_WEBSITE}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-text-secondary transition-colors hover:text-accent"
              >
                {DEV_NAME} · {DEV_WEBSITE_LABEL}
              </a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`mailto:${DEV_EMAIL}`}
              aria-label="Email ClueFind"
              className="text-text-muted transition-colors hover:text-accent"
            >
              <FiMail className="h-4 w-4" />
            </a>
            <a
              href={DEV_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ClueFind on LinkedIn"
              className="text-text-muted transition-colors hover:text-accent"
            >
              <FaLinkedin className="h-4 w-4" />
            </a>
            <a
              href={DEV_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ClueFind on Instagram"
              className="text-text-muted transition-colors hover:text-accent"
            >
              <FaInstagram className="h-4 w-4" />
            </a>
            <a
              href={DEV_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developer website"
              className="text-text-muted transition-colors hover:text-accent"
            >
              <FiGlobe className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
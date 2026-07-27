import { FiMail, FiGlobe } from "react-icons/fi";
import { FaLinkedin, FaInstagram } from "react-icons/fa6";

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "AI Guide", href: "/chat" },
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
    <footer className="relative border-t border-slate-200 bg-[#F7F9FC]">
      {/* faint echo of the hero's ambient blob, kept very subtle here */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(45,91,255,0.35) 35%, rgba(245,165,36,0.35) 65%, transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900">
              Leadly
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2D5BFF] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2D5BFF]" />
              </span>
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-slate-500">
              Leadly turns a keyword into an optimized LinkedIn search URL —
              sharpened by AI suggestions, filtered by exactly how fresh you
              want it. No scraping. No automation. Just smarter search.
            </p>
          </div>

          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-900">
              Navigate
            </h3>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] text-slate-500 transition-colors hover:text-[#2D5BFF]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-900">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] text-slate-500 transition-colors hover:text-[#2D5BFF]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="my-10 h-px w-full bg-slate-200" aria-hidden="true" />

        <div className="flex flex-col items-center justify-between gap-4 text-[12px] text-slate-400 md:flex-row">
          {/* Developer credit */}
        <div className="mt-6 flex justify-center border-t border-slate-200/70 pt-6 md:justify-start">
          <p className="text-[11px] ">
            Designed &amp; built by{" "}
            <a
              href={DEV_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-500 transition-colors hover:text-[#2D5BFF]"
            >
              {DEV_NAME} · {DEV_WEBSITE_LABEL}
            </a>
          </p>
        </div>
          <div className="flex items-center gap-4">
            <a
              href={`mailto:${DEV_EMAIL}`}
              aria-label="Email Leadly"
              className="text-slate-400 transition-colors hover:text-[#2D5BFF]"
            >
              <FiMail className="h-4 w-4" />
            </a>
            <a
              href={DEV_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Leadly on LinkedIn"
              className="text-slate-400 transition-colors hover:text-[#2D5BFF]"
            >
              <FaLinkedin className="h-4 w-4" />
            </a>
            <a
              href={DEV_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Leadly on Instagram"
              className="text-slate-400 transition-colors hover:text-[#2D5BFF]"
            >
              <FaInstagram className="h-4 w-4" />
            </a>
            <a
              href={DEV_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developer website"
              className="text-slate-400 transition-colors hover:text-[#2D5BFF]"
            >
              <FiGlobe className="h-4 w-4" />
            </a>
          </div>
        </div>

        
      </div>
    </footer>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import Starfield from "@/app/components/Starfield";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ClueFind's privacy policy — how we collect, use, and protect your data.",
  alternates: { canonical: "https://cluedeo.vercel.app/privacy-policy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "July 28, 2026";

const SECTIONS = [
  {
    heading: "1. Overview",
    body: [
      "Leadly turns a keyword into an optimized LinkedIn search URL, sharpened by AI suggestions. This policy explains what information we collect when you use Leadly, why we collect it, and the choices you have.",
      "We don't scrape LinkedIn, don't automate actions on your account, and don't collect more than we need to run the product.",
    ],
  },
  {
    heading: "2. Information We Collect",
    body: [
      "Account information: if you sign up, we store your name, email address, and any preferences you set.",
      "Usage data: search keywords, chosen filters, and chat messages sent to the AI Guide are processed to generate results and improve response quality.",
      "Technical data: standard log data such as IP address, browser type, and device information, collected automatically for security and debugging.",
    ],
  },
  {
    heading: "3. How We Use Your Information",
    body: [
      "To generate search URLs and AI Guide responses.",
      "To keep your chat history and preferences available across sessions on your device.",
      "To monitor, secure, and improve the reliability of the product.",
      "To respond to support requests you send us directly.",
    ],
  },
  {
    heading: "4. Third-Party Services",
    body: [
      "Leadly's AI Guide is powered by a third-party language model provider to generate responses. Messages you send to the AI Guide are transmitted to that provider for processing under their own data-handling terms.",
      "We do not sell your personal information to advertisers or data brokers.",
    ],
  },
  {
    heading: "5. Data Storage & Retention",
    body: [
      "Chat sessions are stored locally in your browser so you can return to past conversations. Clearing your browser storage or using the in-app delete option removes them.",
      "We retain account information for as long as your account is active, or as needed to comply with legal obligations.",
    ],
  },
  {
    heading: "6. Your Rights",
    body: [
      "You can request access to, correction of, or deletion of your personal data at any time by contacting us at the email address below.",
      "You can delete individual chat sessions directly from the AI Guide's history panel.",
    ],
  },
  {
    heading: "7. Cookies",
    body: [
      "We use only essential cookies/local storage needed to keep you signed in and remember your chat history — no third-party advertising trackers.",
    ],
  },
  {
    heading: "8. Changes to This Policy",
    body: [
      "We may update this policy from time to time. Material changes will be reflected by updating the date at the top of this page.",
    ],
  },
  {
    heading: "9. Contact Us",
    body: [
      "Questions about this policy? Reach us at hello@leadly.app or through aniketwebdev.in.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    // NAVBAR_HEIGHT matches the site's fixed global navbar (4rem / 64px
    // — same value used on the chat and reply-generator pages). Bump
    // this if the real navbar isn't 64px; nothing else needs to change.
    <main
      className="relative overflow-hidden bg-black px-4 pb-16 sm:px-6"
      style={{ marginTop: "4rem", minHeight: "calc(100dvh - 4rem)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Starfield />
        <div
          className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(255,140,60,0.18) 0%, rgba(255,140,60,0) 70%)",
            filter: "blur(100px)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black to-transparent" />
      </div>

      <div className="relative mx-auto max-w-2xl pt-8 sm:pt-10">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-2 text-[13px] font-semibold text-zinc-400 transition-colors hover:text-[#F5A623]"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-[#0A0A0A] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.6)] sm:p-10">
          <h1
            className="text-2xl font-extrabold tracking-tight sm:text-3xl"
            style={{
              background: "linear-gradient(to bottom, #fff 30%, rgba(255,255,255,0.5) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Privacy Policy
          </h1>
          <p className="mt-2 text-[12px] text-zinc-500">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[15px] font-bold text-white">{section.heading}</h2>
                <div className="mt-2 space-y-2">
                  {section.body.map((paragraph, idx) => (
                    <p key={idx} className="text-[13.5px] leading-relaxed text-zinc-400">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
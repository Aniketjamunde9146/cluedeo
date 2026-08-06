import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import Starfield from "@/app/components/Starfield";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ClueFind's terms of service and usage conditions.",
  alternates: { canonical: "https://cluedeo.vercel.app/terms" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "July 28, 2026";

const SECTIONS = [
  {
    heading: "1. Acceptance of Terms",
    body: [
      "By accessing or using Leadly, you agree to be bound by these Terms of Service. If you don't agree, please don't use the product.",
    ],
  },
  {
    heading: "2. Description of Service",
    body: [
      "Leadly helps you build optimized LinkedIn search URLs from a keyword, with AI-assisted suggestions and freshness filters. Leadly does not scrape LinkedIn data or automate actions on your LinkedIn account — it only generates a search link that opens in LinkedIn's own interface.",
      "The AI Guide feature provides general business and outreach guidance. It is not professional, legal, or financial advice.",
    ],
  },
  {
    heading: "3. User Responsibilities",
    body: [
      "You're responsible for how you use the search links Leadly generates, including complying with LinkedIn's own Terms of Service when you use them.",
      "Don't use Leadly to harass, spam, or otherwise misuse contact information you find.",
    ],
  },
  {
    heading: "4. Intellectual Property",
    body: [
      "Leadly's branding, design, and codebase are the property of their respective owners. You may not copy, resell, or redistribute the product without permission.",
    ],
  },
  {
    heading: "5. AI-Generated Content",
    body: [
      "Responses from the AI Guide are generated automatically and may occasionally be inaccurate or incomplete. Use your own judgment before acting on AI-generated suggestions.",
    ],
  },
  {
    heading: "6. Limitation of Liability",
    body: [
      "Leadly is provided \"as is\" without warranties of any kind. To the fullest extent permitted by law, Leadly and its creator are not liable for any indirect, incidental, or consequential damages arising from your use of the product.",
    ],
  },
  {
    heading: "7. Changes to These Terms",
    body: [
      "We may update these terms occasionally. Continued use of Leadly after a change means you accept the updated terms. Material changes will update the date at the top of this page.",
    ],
  },
  {
    heading: "8. Contact Us",
    body: [
      "Questions about these terms? Reach us at hello@leadly.app or through aniketwebdev.in.",
    ],
  },
];

export default function TermsPage() {
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
            Terms of Service
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
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Leadly",
  description: "The terms that govern your use of Leadly.",
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
    <main className="min-h-dvh bg-[#F7F9FC] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-2 text-[13px] font-semibold text-slate-500 transition-colors hover:text-[#2D5BFF]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-[12px] text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[15px] font-bold text-slate-900">
                  {section.heading}
                </h2>
                <div className="mt-2 space-y-2">
                  {section.body.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-[13.5px] leading-relaxed text-slate-600"
                    >
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
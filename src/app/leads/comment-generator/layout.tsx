import type { Metadata } from "next";

/**
 * app/leads/comment-generator/layout.tsx  (server component — no "use client")
 *
 * Why this file exists: page.tsx in this route is a client component
 * (it needs hooks, Framer Motion, localStorage), and Next only reads
 * the `metadata` export from server components. Splitting the SEO
 * metadata into this layout is the correct fix rather than trying to
 * export it from the client page, where it would be silently ignored.
 *
 * Replace the placeholder OG image path below with a real 1200x630
 * image once one exists — until then, remove the `images` arrays so
 * OG/Twitter don't reference a 404.
 */

const PAGE_URL = "https://cluedeo.vercel.app/leads/comment-generator";
const TITLE = "Reply Generator — Turn Hiring Posts into Warm Leads | ClueFind";
const DESCRIPTION =
  "Paste any hiring or lookout post from LinkedIn, X, or Threads and get a human-sounding reply plus a ready-to-send follow-up DM — matched to your niche, the platform, and how you want to be contacted.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "linkedin comment generator",
    "hiring post reply generator",
    "freelance lead generation tool",
    "AI comment writer",
    "cold outreach comment generator",
    "linkedin lead generation",
    "twitter reply generator",
    "threads reply generator",
  ],
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "ClueFind",
    type: "website",
    // images: [{ url: "https://cluedeo.vercel.app/og/comment-generator.png", width: 1200, height: 630, alt: "ClueFind Reply Generator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // images: ["https://cluedeo.vercel.app/og/comment-generator.png"],
  },
};

export default function CommentGeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
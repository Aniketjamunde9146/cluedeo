import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body face — friendly, rounded, highly legible at small sizes.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

// Display face — used sparingly for headlines. Geometric and precise,
// which reads as "evidence, not decoration" — it carries the brand's
// investigative edge without tipping into gimmick.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Utility face — for case-file labels, eyebrows, filter codes, and
// timestamps. This is the typeface that says "this is a fact," so it's
// reserved for exactly that: tags, URLs, codes — never body copy.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClueFind — Every post is a clue.",
  description:
    "Turn social posts into leads. ClueFind follows the trail — likes, comments, replies — straight to your next client.",
  icons: {
    icon: "/logo.png",
  },
};

// Locks the viewport to the device width and forbids the "double-tap to
// zoom" gesture from fighting with buttons/pills, and paints the browser
// chrome (status bar on iOS, address bar on Android) in the brand's paper
// tone so the app reads as a native surface, not a webpage.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F7F9FC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bg font-sans text-text antialiased">{children}</body>
    </html>
  );
}
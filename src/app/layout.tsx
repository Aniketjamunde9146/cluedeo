import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cluedeo.vercel.app"),
  title: {
    default: "ClueFind — Every post is a clue.",
    template: "%s | ClueFind",
  },
  description:
    "Turn social posts into leads. ClueFind follows the trail — likes, comments, replies — straight to your next client.",
  keywords: [
    "social media leads",
    "lead generation tool",
    "comment generator",
    "social listening",
    "ClueFind",
  ],
  authors: [{ name: "ClueFind" }],
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "ClueFind — Every post is a clue.",
    description:
      "Turn social posts into leads. ClueFind follows the trail — likes, comments, replies — straight to your next client.",
    url: "https://cluedeo.vercel.app",
    siteName: "ClueFind",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ClueFind" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClueFind — Every post is a clue.",
    description:
      "Turn social posts into leads. ClueFind follows the trail — likes, comments, replies — straight to your next client.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://cluedeo.vercel.app",
  },
  verification: {
    google: "TJJaEJ19AITDpVDqe_l8evQeluMEtt9dRJuBZLJz8oY",
  },
};

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
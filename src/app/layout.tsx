import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import ChatWidget from "@/app/components/ChatWidget";

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

// Corrected to the real domain — was previously cluedeo.vercel.app,
// which would have shipped wrong canonical URLs, OG/Twitter image
// URLs, and JSON-LD `url` to search engines and social crawlers.
const SITE_URL = "https://cluefind.vercel.app";
const SITE_NAME = "ClueFind";
const SITE_DESCRIPTION =
  "Turn a keyword into an optimized lead-search URL in seconds. ClueFind follows the trail — keyword, freshness filter, straight to your next client.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — Every post is a clue.`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "lead generation tool",
    "linkedin search builder",
    "social media leads",
    "sales prospecting tool",
    "ClueFind",
    "cluefind",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false },
  icons: { icon: "/logo.png" },
  openGraph: {
    title: `${SITE_NAME} — Every post is a clue.`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Every post is a clue.`,
    description: SITE_DESCRIPTION,
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
    canonical: SITE_URL,
  },
  verification: {
    google: "TJJaEJ19AITDpVDqe_l8evQeluMEtt9dRJuBZLJz8oY",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
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
      <body className="bg-bg font-sans text-text antialiased">
        {/* Structured data — helps Google understand ClueFind as a product, not just a page */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Rendered once, globally — every route shares this one navbar
            instance instead of each page mounting its own. */}
        <Navbar />
        {children}
        {/* Floating site-help widget — mounted once here so it follows
            visitors across every route. Client-only, renders nothing
            until opened, so it has no effect on indexed page content. */}
        <ChatWidget />
      </body>
    </html>
  );
}
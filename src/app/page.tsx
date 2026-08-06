import Hero from "@/app/hero/page";
import AboutUs from "@/app/aboutus/page";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ClueFind",
            url: "https://cluedeo.vercel.app",
            logo: "https://cluedeo.vercel.app/logo.png",
            description:
              "Turn social posts into leads. ClueFind follows the trail — likes, comments, replies — straight to your next client.",
          }),
        }}
      />
      <Navbar />
      <main id="main-content">
        <Hero />
        <AboutUs />
      </main>
      <Footer />
    </>
  );
}
import Hero from "@/app/hero/page";
import AboutUs from "@/app/aboutus/page";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function HomePage() {
  return (
    <>
   
      <Navbar />
      <main id="main-content">
        <Hero />
        <AboutUs />
      </main>
      <Footer />
    </>
  );
}
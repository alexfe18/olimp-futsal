import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import About from "@/components/About";
import History from "@/components/History";
import Achievements from "@/components/Achievements";
import Training from "@/components/Training";
import Gallery from "@/components/Gallery";
import Contacts from "@/components/Contacts";
import Socials from "@/components/Socials";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <Stats />
        <About />
        <History />
        <Achievements />
        <Training />
        <Gallery />
        <Contacts />
        <Socials />
      </main>

      <Footer />
      <BackToTop />
    </>
  );
}

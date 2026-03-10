import Navbar from "@/components/layout/Navbar";
import PageWrapper from "@/components/layout/PageWrapper";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Projects from "@/components/sections/Projects";
import Stats from "@/components/sections/Stats";
import Testimonials from "@/components/sections/Testimonials";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <PageWrapper>
      <Navbar />
      <Hero />
      <Projects />
      <About />
      <Stats />
      <Testimonials />
      <Contact />
      <Footer />
    </PageWrapper>
  );
}

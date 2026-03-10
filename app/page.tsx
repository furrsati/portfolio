import Navbar from "@/components/layout/Navbar";
import PageWrapper from "@/components/layout/PageWrapper";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Projects from "@/components/sections/Projects";
import Stats from "@/components/sections/Stats";
import Testimonials from "@/components/sections/Testimonials";
import Blog from "@/components/sections/Blog";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <PageWrapper>
      <Navbar />
      <Hero />
      <About />
      <Projects />
      <Stats />
      <Testimonials />
      <Blog />
      <Contact />
      <Footer />
    </PageWrapper>
  );
}

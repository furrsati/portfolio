"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Bento from "@/components/bento/Bento";
import Chapter from "@/components/sections/Chapter";
import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import Process from "@/components/sections/Process";
import WorkIntro from "@/components/sections/WorkIntro";
import { projects } from "@/lib/content/projects";
import CommandPalette from "./CommandPalette";
import Nav from "./Nav";
import SmoothScroll from "./SmoothScroll";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });

export default function PageShell() {
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="grain relative">
      <SmoothScroll />
      <Stage />
      <Nav onOpenPalette={() => setPalette(true)} />
      <a href="#work" className="sr-only z-[80] rounded-full bg-text px-4 py-2 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to the work
      </a>
      <main className="relative z-[2]">
        <Hero onOpenPalette={() => setPalette(true)} />
        <WorkIntro />
        {projects.map((p, i) => (
          <Chapter key={p.slug} project={p} n={i + 1} total={projects.length} flip={i % 2 === 1} />
        ))}
        <Bento />
        <Process />
        <Contact />
      </main>
      <footer className="relative z-[2] border-t border-line px-5 py-10 text-[14px] text-text-3 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <span>Dani Zein, full-stack developer. Lebanon, working worldwide.</span>
          <span>© 2026</span>
        </div>
      </footer>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

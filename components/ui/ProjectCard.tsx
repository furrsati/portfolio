"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";
import DeviceShowcase from "@/components/ui/DeviceShowcase";

interface ProjectCardProps {
  title: string;
  subtitle: string;
  description: string;
  tech: string[];
  platforms: readonly string[];
  highlights: string[];
  image: string;
  screenshots?: { web: string; url: string; mobile: string[] } | null;
  reverse?: boolean;
  index?: number;
}

const gradients = [
  "radial-gradient(at 30% 20%, rgba(0,212,255,0.15) 0%, transparent 50%), radial-gradient(at 70% 80%, rgba(123,97,255,0.15) 0%, transparent 50%)",
  "radial-gradient(at 80% 20%, rgba(0,212,255,0.12) 0%, transparent 50%), radial-gradient(at 20% 70%, rgba(255,97,166,0.12) 0%, transparent 50%)",
  "radial-gradient(at 40% 30%, rgba(123,97,255,0.15) 0%, transparent 50%), radial-gradient(at 60% 70%, rgba(0,212,255,0.12) 0%, transparent 50%)",
];

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-md border border-accent/20 font-medium">
      {platform === "iOS" && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )}
      {platform === "Android" && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.51-.38-.83-.22-.31.16-.43.54-.27.85L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
        </svg>
      )}
      {platform === "Web" && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      )}
      {platform}
    </span>
  );
}

export default function ProjectCard({
  title,
  subtitle,
  description,
  tech,
  platforms,
  highlights,
  screenshots,
  reverse = false,
  index = 0,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={fadeInUp}
      className="group"
    >
      <div
        className={`flex flex-col ${
          reverse ? "lg:flex-row-reverse" : "lg:flex-row"
        } gap-8 lg:gap-12 items-center`}
      >
        {/* Project showcase with 3D tilt */}
        <div className="w-full lg:w-1/2" style={{ perspective: "1000px" }}>
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative rounded-xl overflow-visible"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: isHovered
                ? "transform 0.1s ease"
                : "transform 0.5s ease",
            }}
          >
            {screenshots ? (
              <div className="pb-20 md:pb-36">
                <DeviceShowcase
                  web={screenshots.web}
                  mobile={screenshots.mobile}
                  url={screenshots.url}
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border group-hover:border-accent/40 transition-all duration-500">
                <div
                  className="aspect-video flex items-center justify-center relative"
                  style={{ background: gradients[index % gradients.length] }}
                >
                  <div className="absolute inset-0 bg-surface/60" />
                  <div className="text-center relative z-10">
                    <h4 className="text-3xl font-bold text-accent/50 group-hover:text-accent/80 transition-colors duration-500">
                      {title}
                    </h4>
                    <p className="text-text-muted text-sm mt-1">{subtitle}</p>
                  </div>
                </div>
                {/* Glassmorphism overlay on hover */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-white/[0.02] border border-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none shadow-[inset_0_0_30px_rgba(0,212,255,0.1)]" />
              </div>
            )}
          </div>
        </div>

        {/* Project info */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-text-primary group-hover:text-accent transition-colors duration-300">
              {title}
            </h3>
            <p className="text-accent text-sm font-medium mt-1">{subtitle}</p>
          </div>

          <p className="text-text-secondary leading-relaxed">{description}</p>

          {/* Highlights */}
          <ul className="space-y-2">
            {highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2.5 text-text-secondary text-sm"
              >
                <span className="text-accent mt-0.5 text-xs">&#11044;</span>
                {h}
              </li>
            ))}
          </ul>

          {/* Platforms */}
          <div className="flex items-center gap-2">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>

          {/* Tech tags */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {tech.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 bg-surface text-text-muted text-xs rounded-md border border-border/50 hover:border-accent/30 hover:text-text-secondary transition-all duration-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

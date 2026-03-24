"use client";

import { skills } from "@/lib/data";

export default function SkillsMarquee() {
  const doubled = [...skills, ...skills];

  return (
    <div className="relative mt-16 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="flex animate-marquee gap-4">
        {doubled.map((skill, i) => (
          <span
            key={`${skill.name}-${i}`}
            className="shrink-0 px-5 py-2.5 bg-surface border border-border rounded-full text-sm text-text-secondary whitespace-nowrap hover:border-accent hover:text-accent transition-colors duration-300"
          >
            {skill.name}
          </span>
        ))}
      </div>
    </div>
  );
}

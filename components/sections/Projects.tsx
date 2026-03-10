"use client";

import { projects } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import ProjectCard from "@/components/ui/ProjectCard";

export default function Projects() {
  return (
    <section id="projects" className="section-padding bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          title="Featured Projects"
          subtitle="Production-ready applications built with modern technologies"
        />

        <div className="space-y-16 md:space-y-24">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.title}
              {...project}
              reverse={i % 2 === 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

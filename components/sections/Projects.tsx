"use client";

import { motion } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";
import { projects } from "@/lib/data";
import ProjectCard from "@/components/ui/ProjectCard";

export default function Projects() {
  return (
    <section id="projects" className="section-padding bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
          className="mb-10 md:mb-16"
        >
          <p className="text-sm uppercase tracking-widest text-text-muted mb-3">
            Work
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary">
            Platforms in production.
          </h2>
        </motion.div>

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

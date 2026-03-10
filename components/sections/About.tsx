"use client";

import { motion } from "framer-motion";
import {
  fadeInLeft,
  fadeInRight,
  staggerContainer,
  viewportConfig,
} from "@/lib/animations";
import { skills } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import SkillBadge from "@/components/ui/SkillBadge";

export default function About() {
  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <section id="about" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          title="About Me"
          subtitle="A passionate developer who loves turning ideas into reality"
        />

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Bio */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeInLeft}
          >
            <div className="relative mb-8">
              {/* Profile placeholder */}
              <div className="w-48 h-48 mx-auto lg:mx-0 rounded-2xl bg-surface border-2 border-accent/30 flex items-center justify-center overflow-hidden">
                <div className="text-6xl font-bold text-accent/30">DZ</div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-48 h-48 rounded-2xl border border-accent/10 mx-auto lg:mx-0 hidden lg:block" />
            </div>

            <div className="space-y-4 text-text-secondary leading-relaxed">
              <p>
                I&apos;m a Full-Stack Developer specializing in building
                production-ready mobile and web applications. With experience in
                React Native, Next.js, and Node.js, I create seamless
                cross-platform experiences that scale.
              </p>
              <p>
                My work spans complex marketplace platforms with escrow payment
                systems, real-time communication features, and multi-language
                applications supporting RTL layouts. I take pride in writing
                clean, maintainable code and delivering products that solve real
                problems.
              </p>
              <p>
                From database design to pixel-perfect UIs, I handle the full
                development lifecycle — architecture, implementation, testing,
                and deployment.
              </p>
            </div>
          </motion.div>

          {/* Skills */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeInRight}
          >
            <h3 className="text-xl font-semibold text-text-primary mb-6">
              Technologies I Work With
            </h3>
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-3">
                    {category}
                  </p>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportConfig}
                    className="flex flex-wrap gap-2"
                  >
                    {skills
                      .filter((s) => s.category === category)
                      .map((skill) => (
                        <SkillBadge key={skill.name} name={skill.name} />
                      ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

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
import CodeTerminal from "@/components/ui/CodeTerminal";

export default function About() {
  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <section id="about" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          title="About Me"
          subtitle="A passionate developer who loves turning ideas into reality"
        />

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Bio */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeInLeft}
          >
            <div className="mb-8">
              <CodeTerminal />
            </div>

            <div className="space-y-4 text-text-secondary leading-relaxed">
              <p>
                I build the apps that startups launch with. From freelancing
                marketplaces processing real escrow payments to influencer
                platforms serving thousands of users — I ship
                production-ready products, not prototypes.
              </p>
              <p>
                My sweet spot is the hard stuff: escrow payment systems with
                Stripe, real-time messaging with Socket.io, multi-language apps
                with full RTL support, and role-based admin dashboards. If
                it&apos;s complex, I&apos;ve probably built it.
              </p>
              <p>
                One developer, zero handoff friction. I own the full stack — from
                database architecture to pixel-perfect mobile UIs, from API
                design to App Store deployment.
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

"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUp, staggerContainer, viewportConfig } from "@/lib/animations";
import SkillsMarquee from "@/components/ui/SkillsMarquee";

const specialties = [
  {
    title: "Payment Systems & Escrow",
    description: "Stripe integrations, milestone-based payments, subscription billing, connect payouts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Apps & Messaging",
    description: "Socket.io, live chat, typing indicators, push notifications, presence detection",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    title: "Mobile App Development",
    description: "React Native, Expo, iOS & Android builds, App Store & Play Store deployment",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "Admin Dashboards & Panels",
    description: "Role-based access control, dispute resolution, analytics, content moderation",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "Multi-Language & RTL Support",
    description: "Arabic, French, English, full RTL layouts, i18n configuration, locale detection",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    ),
  },
  {
    title: "API Design & Databases",
    description: "REST APIs, PostgreSQL, Prisma ORM, Redis caching, Firebase, auth & JWT systems",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <section id="about" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
          className="mb-10 md:mb-16"
        >
          <p className="text-sm uppercase tracking-widest text-text-muted mb-3">
            About
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary">
            The person behind the code.
          </h2>
        </motion.div>

        {/* Top row: Portrait + Bio */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Portrait Card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeInUp}
            className="flex items-center justify-center p-8 md:p-12"
          >
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full overflow-hidden border-4 border-border shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <Image
                src="/images/portrait.png"
                alt="Dani Zein"
                fill
                className="object-cover object-top"
                sizes="300px"
              />
            </div>
          </motion.div>

          {/* Bio Card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeInUp}
            className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col justify-center"
          >
            <p className="text-text-muted text-sm uppercase tracking-wider mb-2">
              Full-Stack Developer
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Dani Zein
            </h3>
            <div className="space-y-3 text-text-secondary leading-relaxed">
              <p>
                Most startups hire a frontend dev, a backend dev, a mobile dev,
                and a project manager to connect them all. I replace that entire
                chain. Two years in, both Furrsati and Collabfront are live in
                production serving real users and processing real payments.
              </p>
              <p>
                I work best with founders who know what they want to build but
                need someone who can actually build it, end to end, without the
                back-and-forth.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Specialties Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 md:gap-6"
        >
          {specialties.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="bg-surface border border-border rounded-2xl p-5 md:p-6 group hover:border-accent/30 transition-all duration-300 min-w-[200px] w-[200px] aspect-[3/4] shrink-0 snap-start sm:w-auto sm:aspect-auto sm:min-w-0 sm:shrink flex flex-col"
            >
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mb-4 text-text-primary group-hover:border-accent/30 group-hover:text-accent transition-colors duration-300">
                {item.icon}
              </div>
              <p className="text-text-primary font-semibold mb-1.5">
                {item.title}
              </p>
              <p className="text-text-muted text-sm leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Full-width skills marquee */}
      <SkillsMarquee />
    </section>
  );
}

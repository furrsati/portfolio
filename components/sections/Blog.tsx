"use client";

import { motion } from "framer-motion";
import { staggerContainer, viewportConfig } from "@/lib/animations";
import { blogPosts } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import BlogCard from "@/components/ui/BlogCard";

export default function Blog() {
  return (
    <section id="blog" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          title="Latest Articles"
          subtitle="Thoughts and insights on development, technology, and building products"
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="flex gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4 -mx-1 px-1"
        >
          {blogPosts.map((post) => (
            <div key={post.title} className="min-w-[260px] sm:min-w-[300px] md:min-w-[350px] flex-shrink-0 snap-start">
              <BlogCard {...post} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

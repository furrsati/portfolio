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
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {blogPosts.map((post) => (
            <BlogCard key={post.title} {...post} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

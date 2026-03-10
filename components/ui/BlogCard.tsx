"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

interface BlogCardProps {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
}

export default function BlogCard({
  title,
  excerpt,
  date,
  readTime,
}: BlogCardProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.article
      variants={fadeInUp}
      className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,212,255,0.08)]"
    >
      {/* Image placeholder */}
      <div className="aspect-[16/9] bg-gradient-to-br from-surface-light to-background flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(at_30%_40%,rgba(0,212,255,0.08)_0%,transparent_60%),radial-gradient(at_70%_60%,rgba(123,97,255,0.08)_0%,transparent_60%)] group-hover:opacity-150 transition-opacity duration-500" />
        <svg
          className="w-12 h-12 text-accent/20 group-hover:text-accent/40 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
          <span>{formattedDate}</span>
          <span className="w-1 h-1 bg-text-muted rounded-full" />
          <span>{readTime}</span>
        </div>

        <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mb-2 line-clamp-2">
          {title}
        </h3>

        <p className="text-text-secondary text-sm leading-relaxed line-clamp-3">
          {excerpt}
        </p>

        <div className="mt-4">
          <span className="text-accent text-sm font-medium group-hover:underline">
            Read More &rarr;
          </span>
        </div>
      </div>
    </motion.article>
  );
}

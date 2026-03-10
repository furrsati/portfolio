"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DeviceShowcaseProps {
  web: string;
  mobile: string[];
  url: string;
}

function BrowserFrame({ src, url }: { src: string; url: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full"
    >
      {/* Browser chrome */}
      <div className="bg-[#1a1a2e] rounded-t-lg border border-border/50 border-b-0">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-[#0d0d1a] rounded-md px-3 py-1 text-[10px] text-text-muted/50 font-mono truncate">
              {url}
            </div>
          </div>
        </div>
      </div>
      {/* Browser content */}
      <div className="relative rounded-b-lg overflow-hidden border border-border/50 border-t-0">
        <div className="aspect-[16/9] relative bg-[#0d0d1a]">
          <img
            src={src}
            alt="Website screenshot"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </motion.div>
  );
}

function PhoneFrame({
  images,
  delay,
  rotation,
  className,
  floatDelay,
}: {
  images: string[];
  delay: number;
  rotation: number;
  className?: string;
  floatDelay: number;
}) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000 + delay * 800);
    return () => clearInterval(timer);
  }, [next, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 15,
        delay: 0.3 + delay * 0.15,
      }}
      className={className}
      style={{ rotate: `${rotation}deg` }}
    >
      <div
        className="animate-float"
        style={{ animationDelay: `${floatDelay}s` }}
      >
        {/* Phone body */}
        <div className="relative bg-[#1a1a2e] rounded-[20px] p-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.08)]">
          {/* Notch */}
          <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1a1a2e] rounded-b-xl z-20" />
          {/* Screen */}
          <div className="relative rounded-[17px] overflow-hidden bg-[#0d0d1a]">
            <div className="aspect-[9/19.5] relative w-[130px] md:w-[150px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={images[current]}
                    alt="Mobile screenshot"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          {/* Home indicator */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DeviceShowcase({ web, mobile, url }: DeviceShowcaseProps) {
  // Each phone gets all 5 images but starting at a different offset — guarantees uniqueness
  const rotateArray = (arr: string[], offset: number) => [
    ...arr.slice(offset),
    ...arr.slice(0, offset),
  ];
  const phone1Images = rotateArray(mobile, 0);
  const phone2Images = rotateArray(mobile, 2);
  const phone3Images = rotateArray(mobile, 4);

  return (
    <div className="relative w-full">
      {/* Browser frame */}
      <BrowserFrame src={web} url={url} />

      {/* Phone mockups - overlapping bottom right */}
      <div className="hidden md:flex absolute -bottom-32 -right-4 gap-[-10px] items-end z-10">
        <PhoneFrame
          images={phone1Images}
          delay={0}
          rotation={-6}
          floatDelay={0}
          className="relative z-10 translate-x-3"
        />
        <PhoneFrame
          images={phone2Images}
          delay={1}
          rotation={0}
          floatDelay={0.5}
          className="relative z-20 -translate-y-4"
        />
        <PhoneFrame
          images={phone3Images}
          delay={2}
          rotation={6}
          floatDelay={1}
          className="relative z-10 -translate-x-3"
        />
      </div>

      {/* Mobile layout - single phone centered below */}
      <div className="flex md:hidden justify-center mt-4">
        <PhoneFrame
          images={mobile}
          delay={0}
          rotation={0}
          floatDelay={0}
          className="relative"
        />
      </div>

      {/* Glow effect under phones */}
      <div className="hidden md:block absolute -bottom-12 right-0 w-80 h-20 bg-accent/10 blur-3xl rounded-full pointer-events-none" />
    </div>
  );
}

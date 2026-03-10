"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const phrases = [
  "Building Marketplaces",
  "Creating Mobile Apps",
  "Crafting Web Experiences",
  "Engineering Full-Stack Solutions",
];

export default function TypeWriter() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const currentPhrase = phrases[phraseIndex];

  const tick = useCallback(() => {
    if (!isDeleting) {
      setText(currentPhrase.slice(0, text.length + 1));
      if (text.length + 1 === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 2000);
        return;
      }
    } else {
      setText(currentPhrase.slice(0, text.length - 1));
      if (text.length - 1 === 0) {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        return;
      }
    }
  }, [text, isDeleting, currentPhrase]);

  useEffect(() => {
    const speed = isDeleting ? 40 : 80;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting]);

  return (
    <span className="inline-flex items-center">
      <span className="text-gradient">{text}</span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[2px] h-[1.2em] bg-accent ml-1"
      />
    </span>
  );
}

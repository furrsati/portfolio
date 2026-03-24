"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function LoadingScreen({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 rgba(15, 23, 42, 0)",
                    "0 0 40px rgba(15, 23, 42, 0.15)",
                    "0 0 0 rgba(15, 23, 42, 0)",
                  ],
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="inline-block rounded-full p-1"
              >
                <Image
                  src="/images/portrait.jpg"
                  alt="Dani Zein"
                  width={80}
                  height={80}
                  className="rounded-full object-cover w-20 h-20"
                  priority
                />
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
                className="h-[2px] bg-gradient-to-r from-accent to-[#475569] mt-4 mx-auto max-w-[80px]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </>
  );
}

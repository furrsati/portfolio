"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";
import Button from "@/components/ui/Button";
import { socialLinks } from "@/lib/data";

export default function Contact() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (res.ok) {
        setStatus("sent");
        setFormState({ name: "", email: "", message: "" });
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const inputClasses =
    "w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_rgba(15,23,42,0.1)] transition-all duration-300";

  return (
    <section id="contact" className="section-padding bg-surface">
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
          className="mb-12"
        >
          <p className="text-sm uppercase tracking-widest text-text-muted mb-3">
            Contact
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Got something to build?
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            Whether it&apos;s a marketplace, a mobile app, or a platform with
            complex payments, I&apos;m currently available for new projects.
          </p>
        </motion.div>

        {/* Quick contact chips */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
          className="flex flex-wrap items-center gap-3 mb-10"
        >
          <a
            href="mailto:zeindani82@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-lg text-text-secondary text-sm hover:border-accent hover:text-accent transition-all duration-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            zeindani82@gmail.com
          </a>
          {socialLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-text-secondary text-sm hover:border-accent hover:text-accent transition-all duration-300"
            >
              {label}
            </a>
          ))}
        </motion.div>

        {/* Form */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm text-text-secondary mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  placeholder="Your name"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm text-text-secondary mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formState.email}
                  onChange={(e) =>
                    setFormState({ ...formState, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm text-text-secondary mb-2"
              >
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={formState.message}
                onChange={(e) =>
                  setFormState({ ...formState, message: e.target.value })
                }
                placeholder="Tell me about your project..."
                className={`${inputClasses} resize-none`}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending..."
                : status === "sent"
                ? "Message Sent!"
                : status === "error"
                ? "Failed - Try Again"
                : "Send Message"}
            </Button>

            {status === "sent" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-emerald-600 text-sm text-center"
              >
                Thanks! I&apos;ll get back to you soon.
              </motion.p>
            )}
          </form>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeLine {
  text: string;
  className: string;
}

interface CodeSnippet {
  filename: string;
  lines: CodeLine[];
}

const snippets: CodeSnippet[] = [
  {
    filename: "escrow.ts",
    lines: [
      { text: "// Stripe escrow payment release", className: "text-[#6B6B80]" },
      {
        text: "async function ",
        className: "text-[#818CF8]",
      },
      {
        text: "releaseMilestone",
        className: "text-[#A78BFA]",
      },
      {
        text: "(milestoneId: string) {",
        className: "text-[#A0A0B8]",
      },
      {
        text: '  const milestone = await prisma',
        className: "text-[#A0A0B8]",
      },
      {
        text: "    .milestone.findUnique({",
        className: "text-[#A0A0B8]",
      },
      {
        text: '      where: { id: milestoneId },',
        className: "text-[#A0A0B8]",
      },
      {
        text: "    });",
        className: "text-[#A0A0B8]",
      },
      { text: "", className: "" },
      {
        text: "  await stripe.transfers.create({",
        className: "text-[#A0A0B8]",
      },
      {
        text: "    amount: milestone.amount,",
        className: "text-[#818CF8]",
      },
      {
        text: '    currency: "usd",',
        className: "text-purple-400",
      },
      {
        text: "    destination: milestone.freelancerStripeId,",
        className: "text-[#A0A0B8]",
      },
      {
        text: "  });",
        className: "text-[#A0A0B8]",
      },
      {
        text: "}",
        className: "text-[#A0A0B8]",
      },
    ],
  },
  {
    filename: "useSocket.ts",
    lines: [
      { text: "// Real-time messaging hook", className: "text-[#6B6B80]" },
      {
        text: "function ",
        className: "text-[#818CF8]",
      },
      {
        text: "useSocket",
        className: "text-[#A78BFA]",
      },
      {
        text: "(chatId: string) {",
        className: "text-[#A0A0B8]",
      },
      {
        text: "  const [messages, setMessages] =",
        className: "text-[#A0A0B8]",
      },
      {
        text: "    useState<Message[]>([]);",
        className: "text-[#818CF8]",
      },
      { text: "", className: "" },
      {
        text: "  useEffect(() => {",
        className: "text-[#818CF8]",
      },
      {
        text: '    socket.emit("join", chatId);',
        className: "text-purple-400",
      },
      {
        text: '    socket.on("message", (msg) => {',
        className: "text-purple-400",
      },
      {
        text: "      setMessages(prev =>",
        className: "text-[#A0A0B8]",
      },
      {
        text: "        [...prev, msg]",
        className: "text-[#A0A0B8]",
      },
      {
        text: "      );",
        className: "text-[#A0A0B8]",
      },
      {
        text: "    });",
        className: "text-[#A0A0B8]",
      },
      {
        text: "  }, [chatId]);",
        className: "text-[#818CF8]",
      },
    ],
  },
  {
    filename: "i18n.config.ts",
    lines: [
      { text: "// Multi-language RTL support", className: "text-[#6B6B80]" },
      {
        text: "export const ",
        className: "text-[#818CF8]",
      },
      {
        text: "i18nConfig",
        className: "text-[#A78BFA]",
      },
      {
        text: " = {",
        className: "text-[#A0A0B8]",
      },
      {
        text: '  locales: ["en", "fr", "ar"],',
        className: "text-purple-400",
      },
      {
        text: '  defaultLocale: "en",',
        className: "text-purple-400",
      },
      { text: "", className: "" },
      {
        text: "  rtlLocales: [\"ar\"],",
        className: "text-purple-400",
      },
      { text: "", className: "" },
      {
        text: "  getDirection: (locale) =>",
        className: "text-[#A0A0B8]",
      },
      {
        text: '    rtlLocales.includes(locale)',
        className: "text-[#A0A0B8]",
      },
      {
        text: '      ? "rtl" : "ltr",',
        className: "text-[#818CF8]",
      },
      { text: "", className: "" },
      {
        text: "  // Auto-detect from browser",
        className: "text-[#6B6B80]",
      },
      {
        text: "  detect: [\"cookie\", \"header\"],",
        className: "text-purple-400",
      },
    ],
  },
];

export default function CodeTerminal() {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const currentSnippet = snippets[snippetIndex];

  const advanceSnippet = useCallback(() => {
    setIsTyping(false);
    setTimeout(() => {
      setSnippetIndex((prev) => (prev + 1) % snippets.length);
      setVisibleLines(0);
      setIsTyping(true);
    }, 600);
  }, []);

  useEffect(() => {
    if (!isTyping) return;

    if (visibleLines < currentSnippet.lines.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 120);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(advanceSnippet, 3000);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, isTyping, currentSnippet.lines.length, advanceSnippet]);

  return (
    <div className="relative group">
      {/* Editor window */}
      <div className="relative bg-[#0d0d1a] rounded-xl border border-border/50 group-hover:border-accent/30 transition-all duration-500 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] border-b border-border/30">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>

          {/* File tabs */}
          <div className="flex ml-4 gap-0.5">
            {snippets.map((s, i) => (
              <button
                key={s.filename}
                onClick={() => {
                  setSnippetIndex(i);
                  setVisibleLines(0);
                  setIsTyping(true);
                }}
                className={`px-2 sm:px-3 py-1 text-[10px] font-mono rounded-t-md transition-all duration-300 ${
                  i === snippetIndex
                    ? "bg-[#0d0d1a] text-[#818CF8] border-t border-x border-accent/20"
                    : "text-[#6B6B80]/50 hover:text-[#6B6B80]"
                }`}
              >
                {s.filename}
              </button>
            ))}
          </div>
        </div>

        {/* Code area */}
        <div className="p-3 sm:p-4 font-mono text-xs md:text-sm min-h-[180px] md:min-h-[280px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={snippetIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {currentSnippet.lines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start"
                  style={{
                    opacity: i < visibleLines ? 1 : 0,
                    transform: i < visibleLines ? "translateY(0)" : "translateY(4px)",
                    transition: "opacity 0.15s ease, transform 0.15s ease",
                  }}
                >
                  <span className="text-[#6B6B80]/30 w-6 text-right mr-4 select-none text-[10px] leading-6 hidden sm:inline">
                    {i + 1}
                  </span>
                  <span className={`${line.className} leading-6 whitespace-pre-wrap`}>
                    {line.text}
                  </span>
                  {/* Typing cursor on the last visible line */}
                  {i === visibleLines - 1 && isTyping && visibleLines < currentSnippet.lines.length && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="inline-block w-[2px] h-4 bg-[#818CF8] ml-0.5 mt-1"
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-accent/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
      {/* Offset border decoration */}
      <div className="absolute -bottom-2 -right-2 w-full h-full rounded-xl border border-accent/10 -z-10 hidden lg:block" />
    </div>
  );
}

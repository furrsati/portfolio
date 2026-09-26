"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ProjectLogo from "@/components/ui/ProjectLogo";
import { projects } from "@/lib/content/projects";

type Action = { id: string; label: string; hint: string; color?: string; logo?: string; run: () => void };

const EMAIL = "danizein@furrsati.com";

function go(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Palette key="palette" onClose={onClose} />}</AnimatePresence>;
}

/** Mounted fresh on every open, so the query and selection always start empty. */
function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const actions: Action[] = useMemo(
    () => [
      ...projects.map((p) => ({
        id: p.slug,
        label: p.name,
        hint: `${p.status} · ${p.credit.toLowerCase()}`,
        color: p.glow[0],
        logo: p.slug,
        run: () => go(`#${p.slug}`),
      })),
      { id: "skills", label: "What I do best", hint: "Live demos", run: () => go("#skills") },
      { id: "contact", label: "Start a project", hint: "Send a brief", run: () => go("#contact") },
      {
        id: "email",
        label: copied ? "Email copied" : "Copy email address",
        hint: EMAIL,
        run: () => {
          navigator.clipboard?.writeText(EMAIL);
          setCopied(true);
        },
      },
      { id: "github", label: "Open GitHub", hint: "github.com/furrsati", run: () => window.open("https://github.com/furrsati", "_blank") },
      { id: "linkedin", label: "Open LinkedIn", hint: "linkedin.com/in/danizein", run: () => window.open("https://www.linkedin.com/in/danizein", "_blank") },
    ],
    [copied],
  );

  const list = actions.filter((a) => (a.label + " " + a.hint).toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    const id = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(id);
  }, []);

  const choose = (a: Action | undefined) => {
    if (!a) return;
    a.run();
    if (a.id !== "email") onClose();
  };

  return (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Jump anywhere"
            initial={{ y: 12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-line-strong bg-[#0c0d10]/95 shadow-[0_30px_120px_rgba(0,0,0,.7)]"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(list.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") choose(list[active]);
            }}
          >
            <label className="sr-only" htmlFor="cmdk">
              Search projects and actions
            </label>
            <input
              id="cmdk"
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder="Jump to a project, or type ‘email’"
              className="h-16 w-full border-b border-line bg-transparent px-6 text-[17px] text-text outline-none placeholder:text-text-3"
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={list[active] ? `cmdk-${list[active].id}` : undefined}
            />
            <ul id="cmdk-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
              {list.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-text-3">Nothing matches. Try a project name.</li>}
              {list.map((a, i) => (
                <li
                  key={a.id}
                  id={`cmdk-${a.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(a)}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3 text-[15px] transition-colors ${i === active ? "bg-white/[0.07] text-text" : "text-text-2"}`}
                >
                  <span className="flex items-center gap-3">
                    {a.logo ? (
                      <ProjectLogo slug={a.logo} name={a.label} size={22} />
                    ) : (
                      <span className="mx-[7px] h-2 w-2 rounded-full" style={{ background: a.color ?? "var(--text-3)" }} aria-hidden="true" />
                    )}
                    {a.label}
                  </span>
                  <span className="text-[13px] text-text-3">{a.hint}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
  );
}

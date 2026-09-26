"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Copy, LayoutGrid, Route, Search, Send, Sparkles, X, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ProjectLogo from "@/components/ui/ProjectLogo";
import { projects } from "@/lib/content/projects";

type Group = "Products" | "Explore" | "Get in touch";
type Action = { id: string; label: string; hint: string; group: Group; icon?: LucideIcon; logo?: string; run: () => void };

const EMAIL = "danizein@furrsati.com";

/** Phones (portrait) and short landscape screens get a full-width sheet instead of the floating palette. */
const SHEET = "(max-width: 639px), (max-height: 500px)";

function go(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Palette key="palette" onClose={onClose} />}</AnimatePresence>;
}

/**
 * Mounted fresh on every open, so the query and selection always start empty.
 * On desktop it is the ⌘K palette; on phones it is the site menu, a sheet that
 * drops from the top: full width, big rows, and closes with the ✕, a tap on
 * the dimmed page, a swipe up on the handle, or Escape.
 */
function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [kbd, setKbd] = useState(false);
  const [copied, setCopied] = useState(false);
  // Only ever rendered in the browser (it mounts on open), so reading the media queries here is safe.
  const [sheet] = useState(() => window.matchMedia(SHEET).matches);
  const [touch] = useState(() => window.matchMedia("(hover: none), (pointer: coarse)").matches);
  const reduced = useReducedMotion() ?? false;
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLUListElement>(null);
  const drag = useDragControls();

  const actions: Action[] = useMemo(() => {
    const products: Action[] = projects.map((p) => ({
      id: p.slug,
      label: p.name,
      hint: `${p.status} · ${p.credit.toLowerCase()}`,
      group: "Products",
      logo: p.slug,
      run: () => go(`#${p.slug}`),
    }));
    const explore: Action[] = [
      { id: "work", label: "All the work", hint: `${projects.length} products`, group: "Explore", icon: LayoutGrid, run: () => go("#work") },
      { id: "skills", label: "What I do best", hint: "Live demos", group: "Explore", icon: Sparkles, run: () => go("#skills") },
      { id: "process", label: "How I work", hint: "From brief to launch", group: "Explore", icon: Route, run: () => go("#process") },
    ];
    const contact: Action[] = [
      { id: "contact", label: "Start a project", hint: "Send a brief", group: "Get in touch", icon: Send, run: () => go("#contact") },
      {
        id: "email",
        label: copied ? "Email copied" : "Copy email address",
        hint: EMAIL,
        group: "Get in touch",
        icon: copied ? Check : Copy,
        run: () => {
          navigator.clipboard?.writeText(EMAIL);
          setCopied(true);
        },
      },
      {
        id: "github",
        label: "Open GitHub",
        hint: "github.com/furrsati",
        group: "Get in touch",
        icon: ArrowUpRight,
        run: () => window.open("https://github.com/furrsati", "_blank", "noopener"),
      },
      {
        id: "linkedin",
        label: "Open LinkedIn",
        hint: "linkedin.com/in/danizein",
        group: "Get in touch",
        icon: ArrowUpRight,
        run: () => window.open("https://www.linkedin.com/in/danizein", "_blank", "noopener"),
      },
    ];
    // As a phone menu, the site's sections come first; as a palette, the products do.
    return sheet ? [...explore, ...products, ...contact] : [...products, ...explore, ...contact];
  }, [copied, sheet]);

  const list = actions.filter((a) => (a.label + " " + a.hint).toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    // Touch screens: no keyboard popping up over the menu. Focus the sheet; the
    // search field is one tap away.
    const id = setTimeout(() => (touch ? dialog.current?.focus({ preventScroll: true }) : input.current?.focus()), 30);
    // The page behind must not scroll: the wheel is kept to the list, and
    // touch panning is off everywhere but the list (touch-action, below).
    const el = overlay.current;
    const onWheel = (e: WheelEvent) => {
      if (!listEl.current?.contains(e.target as Node)) e.preventDefault();
    };
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(id);
      el?.removeEventListener("wheel", onWheel);
    };
  }, [touch]);

  const choose = (a: Action | undefined) => {
    if (!a) return;
    a.run();
    if (a.id !== "email") onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setKbd(true);
      setActive((i) => Math.min(list.length - 1, i + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setKbd(true);
      setActive((i) => Math.max(0, i - 1));
    }
    if (e.key === "Enter") choose(list[active]);
    if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const f = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input, button") ?? []);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // On touch screens the first row only lights up once you type or use the arrow keys.
  const showActive = !touch || kbd || q.trim() !== "";

  const enter = reduced ? { opacity: 0 } : sheet ? { y: "-100%" } : { y: 12, scale: 0.98, opacity: 0 };
  const leave = reduced ? { opacity: 0 } : sheet ? { y: "-100%" } : { y: 8, scale: 0.98, opacity: 0 };

  return (
    <motion.div
      ref={overlay}
      data-lenis-prevent
      className={`fixed inset-0 z-[70] flex touch-none items-start justify-center bg-black/60 backdrop-blur-md ${sheet ? "" : "px-4 pt-[14vh]"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={sheet ? "Menu" : "Jump anywhere"}
        tabIndex={-1}
        initial={enter}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={leave}
        transition={sheet ? { type: "spring", stiffness: 420, damping: 42 } : { type: "spring", stiffness: 500, damping: 36 }}
        drag={sheet ? "y" : false}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.9, bottom: 0.04 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -60 || info.velocity.y < -500) onClose();
        }}
        className={
          sheet
            ? "flex max-h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden rounded-b-[28px] border-b border-line-strong bg-[#0c0d10]/95 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] shadow-[0_30px_120px_rgba(0,0,0,.7)] outline-none!"
            : "flex max-h-[calc(86vh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border border-line-strong bg-[#0c0d10]/95 shadow-[0_30px_120px_rgba(0,0,0,.7)] outline-none!"
        }
        onKeyDown={onKeyDown}
      >
        <div
          className={
            sheet
              ? "mx-auto flex w-full max-w-[640px] items-center gap-2 px-3 pb-2 pt-3"
              : "flex shrink-0 items-center border-b border-line transition-colors focus-within:border-line-strong"
          }
        >
          <label className="sr-only" htmlFor="cmdk">
            Search projects and actions
          </label>
          <div className="relative min-w-0 flex-1">
            {sheet && <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-2/75" aria-hidden="true" />}
            <input
              id="cmdk"
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder={sheet ? "Search projects" : "Jump to a project, or type ‘email’"}
              className={
                sheet
                  ? "h-12 w-full rounded-2xl border border-line bg-white/[0.04] pl-11 pr-4 text-[17px] text-text outline-none! transition-colors placeholder:text-text-2/70 focus:border-line-strong focus:bg-white/[0.06]"
                  : "h-16 w-full bg-transparent px-6 text-[17px] text-text outline-none! placeholder:text-text-2/70"
              }
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={list[active] ? `cmdk-${list[active].id}` : undefined}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
            />
          </div>
          {(sheet || touch) && (
            // Touch screens get an explicit close; with a keyboard, Escape does it.
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line text-text-2 transition-colors [-webkit-tap-highlight-color:transparent] hover:text-text active:bg-white/10 active:text-text ${sheet ? "" : "mr-2.5"}`}
            >
              <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>

        <ul
          id="cmdk-list"
          ref={listEl}
          role="listbox"
          aria-label="Results"
          className={`min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain ${sheet ? "mx-auto w-full max-w-[640px] px-2 pb-1 [mask-image:linear-gradient(to_bottom,transparent,#000_12px)]" : "max-h-[52vh] p-2"}`}
        >
          {list.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-text-2/75">Nothing matches. Try a project name.</li>}
          {list.map((a, i) => {
            const on = i === active && showActive;
            const heading = sheet && (i === 0 || list[i - 1].group !== a.group);
            const Icon = a.icon;
            return (
              <Fragment key={a.id}>
                {heading && (
                  <li role="presentation" className="px-3 pb-1.5 pt-3 text-[12px] font-medium uppercase tracking-[0.08em] text-text-2/75">
                    {a.group}
                  </li>
                )}
                {sheet ? (
                  <li
                    id={`cmdk-${a.id}`}
                    role="option"
                    aria-selected={i === active}
                    onClick={() => choose(a)}
                    className={`flex min-h-[60px] cursor-pointer select-none items-center gap-3.5 rounded-2xl px-3 py-2 transition-colors [-webkit-tap-highlight-color:transparent] active:bg-white/[0.08] ${on ? "bg-white/[0.07]" : ""}`}
                  >
                    {a.logo ? (
                      <ProjectLogo slug={a.logo} name={a.label} size={36} />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[22%] border border-line bg-white/[0.04] text-text-2" aria-hidden="true">
                        {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[16px] leading-tight text-text">{a.label}</span>
                      <span className="mt-0.5 truncate text-[13px] leading-tight text-text-2/75">{a.hint}</span>
                    </span>
                  </li>
                ) : (
                  <li
                    id={`cmdk-${a.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(a)}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3 text-[15px] transition-colors active:bg-white/[0.08] ${on ? "bg-white/[0.07] text-text" : "text-text-2"}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {a.logo ? (
                        <ProjectLogo slug={a.logo} name={a.label} size={22} />
                      ) : (
                        <span className="mx-[7px] h-2 w-2 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
                      )}
                      <span className="truncate">{a.label}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-text-2/75">{a.hint}</span>
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>

        {sheet && (
          // Swipe the handle up to put the sheet away.
          <div
            onPointerDown={(e) => drag.start(e)}
            className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            aria-hidden="true"
          >
            <span className="h-1 w-10 rounded-full bg-white/25" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

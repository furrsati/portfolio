"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useAutoDemo, useDemoScript } from "@/components/bento/useAutoDemo";
import ProjectLogo from "@/components/ui/ProjectLogo";
import { bySlug, EASE, engagements } from "./data";

/** How long each type stays up while the chooser plays by itself. */
const CYCLE = 4200;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "What do you need?": the five kinds of engagement as a chooser. While it's
 * on screen and nobody has touched it, it steps through them on its own
 * (pausing while the pointer rests on it). The first press, tap or key and
 * it's the visitor's. Every panel is stacked in one cell, so the box is always
 * as tall as the longest and switching never moves the page.
 */
export default function Chooser() {
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>({ amount: 0.4 });
  const [sel, setSel] = useState(0);
  const [resting, setResting] = useState(false);
  const cycling = demoActive && !resting;
  useDemoScript(cycling, [{ at: CYCLE, run: () => setSel((s) => (s + 1) % engagements.length) }], { loop: true, loopDelay: 1 });
  const e = engagements[sel];

  const onKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    const n = engagements.length;
    const to =
      ev.key === "ArrowDown" || ev.key === "ArrowRight" ? (sel + 1) % n : ev.key === "ArrowUp" || ev.key === "ArrowLeft" ? (sel - 1 + n) % n : ev.key === "Home" ? 0 : ev.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    ev.preventDefault();
    setSel(to);
    document.getElementById(`need-tab-${to}`)?.focus();
  };

  return (
    <div
      ref={demoRef}
      onPointerEnter={(ev) => ev.pointerType === "mouse" && setResting(true)}
      onPointerLeave={() => setResting(false)}
      className="mx-auto grid max-w-[1500px] grid-cols-1 gap-10 px-5 md:px-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-12 lg:px-12 xl:gap-16 2xl:px-16"
    >
      <div className="min-w-0 lg:max-w-[520px]">
        <div className="flex h-7 items-center gap-3">
          <span className="text-[13px] text-text-3">Where to start</span>
          <AnimatePresence>
            {cycling && (
              <motion.span
                key="demo"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] text-text-3"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: e.accent }} />
                  <span className="relative h-1.5 w-1.5 rounded-full transition-colors duration-500" style={{ background: e.accent }} />
                </span>
                Browsing on its own · tap to pick
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <h3 className="mt-3 text-[clamp(2.1rem,4.2vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.03em] [font-variation-settings:'wdth'_80,'opsz'_96]">
          What do you need?
        </h3>
        <p className="mt-4 max-w-[44ch] text-[clamp(1rem,1.3vw,1.125rem)] leading-[1.5] text-text-2">
          Pick the closest fit. Each one points to work where I’ve already done it.
        </p>

        <div role="tablist" aria-label="What you need" aria-orientation="vertical" onKeyDown={onKey} className="mt-8 flex flex-col gap-1">
          {engagements.map((x, i) => {
            const on = sel === i;
            return (
              <button
                key={x.name}
                id={`need-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`need-panel-${i}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setSel(i)}
                className="group/tab relative flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 py-3 text-left md:min-h-[60px] md:py-0"
              >
                {on && (
                  <motion.span
                    layoutId="need-pill"
                    className="absolute inset-0 rounded-2xl border border-white/[0.09] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                <span className="relative w-6 text-[12.5px] tabular-nums transition-colors duration-500" style={{ color: on ? x.accent : "var(--text-3)" }}>
                  {pad(i + 1)}
                </span>
                <span
                  className={`relative min-w-0 flex-1 text-[clamp(1.05rem,1.45vw,1.3rem)] leading-[1.25] font-medium tracking-[-0.012em] transition-colors duration-300 ${
                    on ? "text-text" : "text-text-3 group-hover/tab:text-text-2"
                  }`}
                >
                  {x.name}
                </span>
                <ArrowRight
                  className="relative h-4 w-4 shrink-0 transition-[opacity,transform] duration-300"
                  style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateX(-6px)", color: x.accent }}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {/* How long until it moves on, while it plays by itself */}
                {on && cycling && (
                  <span className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full" aria-hidden="true">
                    <motion.span
                      key={`${sel}`}
                      className="block h-full origin-left rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${x.accent})` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: CYCLE / 1000, ease: "linear" }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        onPointerMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          ev.currentTarget.style.setProperty("--mx", `${ev.clientX - r.left}px`);
          ev.currentTarget.style.setProperty("--my", `${ev.clientY - r.top}px`);
        }}
        onPointerLeave={(ev) => {
          ev.currentTarget.style.setProperty("--mx", "-999px");
          ev.currentTarget.style.setProperty("--my", "-999px");
        }}
        style={{ ["--tile-glow" as string]: e.accent }}
        className="spot relative grid min-w-0 self-start overflow-hidden rounded-[28px] border border-white/[0.09] bg-[rgba(12,13,16,0.6)] shadow-[0_50px_120px_-60px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:rounded-[32px] lg:mt-10"
      >
        {engagements.map((x, i) => (
          <div
            key={x.name}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-[900ms]"
            style={{
              opacity: sel === i ? 1 : 0,
              background: `radial-gradient(60% 60% at 88% 0%, color-mix(in oklab, ${x.accent} 16%, transparent), transparent 70%), radial-gradient(50% 50% at 0% 100%, color-mix(in oklab, ${x.accent} 8%, transparent), transparent 70%)`,
            }}
          />
        ))}

        {/* The number, big and outlined, rolling as the choice changes */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[0.04em] -top-[0.1em] h-[0.84em] w-[1.3em] select-none overflow-hidden text-[clamp(7rem,11vw,10.5rem)] font-extrabold leading-[0.84] tracking-[-0.05em] [font-variation-settings:'wdth'_75,'opsz'_96]"
          style={{ maskImage: "linear-gradient(200deg, #000 20%, transparent 85%)" }}
        >
          {engagements.map((x, i) => (
            <span
              key={x.name}
              className="absolute inset-0 block text-right text-transparent transition-[transform,opacity] duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
              style={{
                WebkitTextStroke: `1.25px color-mix(in oklab, ${x.accent} 50%, rgba(255,255,255,0.18))`,
                opacity: sel === i ? 1 : 0,
                transform: sel === i ? "none" : i < sel ? "translateY(-70%)" : "translateY(70%)",
              }}
            >
              {pad(i + 1)}
            </span>
          ))}
        </div>

        {engagements.map((x, i) => {
          const on = sel === i;
          return (
            <div
              key={x.name}
              id={`need-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`need-tab-${i}`}
              inert={!on}
              className="relative col-start-1 row-start-1 flex flex-col p-6 transition-[opacity,visibility,transform,filter] md:p-9"
              style={{
                opacity: on ? 1 : 0,
                visibility: on ? "visible" : "hidden",
                transform: on ? "none" : "translateY(10px)",
                filter: on ? "none" : "blur(4px)",
                transitionDuration: on ? "600ms" : "280ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: on ? "80ms" : "0ms",
              }}
            >
              <div className="flex items-center gap-2.5 text-[13px] text-text-3">
                <span className="h-2 w-2 rounded-full" style={{ background: x.accent, boxShadow: `0 0 10px ${x.accent}` }} />
                <span className="tabular-nums">
                  <span className="text-text-2">{pad(i + 1)}</span> / {pad(engagements.length)}
                </span>
              </div>
              <h4 className="mt-5 max-w-[18ch] text-[clamp(1.75rem,3vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-text [font-variation-settings:'wdth'_85,'opsz'_96]">
                {x.name}
              </h4>
              <p className="mt-3 max-w-[46ch] text-[clamp(1rem,1.25vw,1.125rem)] leading-[1.55] text-text-2">{x.body}</p>

              <div className="mt-7 text-[13px] text-text-3">Seen in</div>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {x.seen.map((slug, k) => {
                  const p = bySlug[slug];
                  return (
                    <li
                      key={slug}
                      className="transition-[opacity,transform] duration-500"
                      style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(8px)", transitionDelay: on ? `${160 + k * 80}ms` : "0ms" }}
                    >
                      <a
                        href={`#${slug}`}
                        style={{ ["--brand" as string]: p.glow[0] }}
                        className="group/p relative flex h-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] p-3 transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--brand)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--brand)_7%,transparent)] sm:flex-col sm:items-start sm:gap-3.5 sm:p-3.5"
                      >
                        <ProjectLogo slug={p.slug} name={p.name} size={38} />
                        <span className="min-w-0 flex-1 sm:w-full">
                          <span className="block truncate text-[14.5px] font-medium leading-tight text-text">{p.name}</span>
                          <span className="mt-1 block truncate text-[12px] leading-tight text-text-3">
                            {p.credit} · {p.status}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-text-3 transition-[color,transform] duration-300 group-hover/p:-translate-y-0.5 group-hover/p:translate-x-0.5 group-hover/p:text-text sm:absolute sm:right-3.5 sm:top-3.5"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-auto md:pt-8">
                <a
                  href="#contact"
                  className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-text px-6 text-[15px] font-medium text-black transition-transform duration-300 hover:scale-[1.03]"
                >
                  Start this project
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
                </a>
                <span className="text-[13px] text-text-3">Reply within a working day.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

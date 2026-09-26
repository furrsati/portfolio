"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import type { Project } from "@/lib/content/projects";

export const beats = [
  { key: "challenge", label: "The challenge" },
  { key: "built", label: "What I built" },
  { key: "result", label: "The result" },
] as const;

/** Pinned-range progress where each beat starts; the last one runs to 1. */
export const beatStarts = [0, 0.34, 0.67] as const;
export const beatAt = (v: number) => (v < beatStarts[1] ? 0 : v < beatStarts[2] ? 1 : 2);

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DUR = 620;

/** One thin segment of the rail. It fills with the pin progress through its beat. */
function Segment({ pin, i, a, b }: { pin: MotionValue<number>; i: number; a: string; b: string }) {
  const start = beatStarts[i];
  const end = i < 2 ? beatStarts[i + 1] : 1;
  const fill = useTransform(pin, [start, end], [0, 1], { clamp: true });
  return (
    <span aria-hidden="true" className="absolute bottom-1 left-0 top-1 w-[2px] overflow-hidden rounded-full bg-white/[0.09]">
      <motion.span
        className="absolute inset-0 origin-top rounded-full"
        style={{ scaleY: fill, background: `linear-gradient(to bottom, ${a}, color-mix(in oklab, ${a} 55%, ${b}))` }}
      />
    </span>
  );
}

type Props = {
  project: Project;
  beat: number;
  onPick: (i: number) => void;
  pin: MotionValue<number>;
};

const para = "text-[15px] leading-[1.6] text-[#c9cbd0] [@media(min-height:860px)]:text-[16px] [@media(min-height:1000px)]:text-[17px]";
const bodyPad = "pb-3.5 pl-[2.6rem] pr-1 pt-0.5";

/**
 * The story in three beats, stacked on a vertical rail. The open beat shows its
 * paragraph; the others fold down to their label. An invisible twin reserves
 * "three labels + the longest paragraph", so whichever beat is open, and while
 * one folds into the next, nothing outside the rail ever moves.
 */
export default function StoryRail({ project, beat, onPick, pin }: Props) {
  const [a, b] = project.glow;
  const id = (k: string) => `${project.slug}-beat-${k}`;

  return (
    <div className="relative">
      {/* Twin: fixes the rail's height at "labels + the longest paragraph". */}
      <div aria-hidden="true" className="invisible">
        {beats.map((bt, i) => (
          <div key={bt.key}>
            <div className="h-10 [@media(min-height:860px)]:h-11" />
            {i === 0 && (
              <div className={`grid ${bodyPad}`}>
                {beats.map((x) => (
                  <p key={x.key} className={`col-start-1 row-start-1 ${para}`}>
                    {project.story[x.key]}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ol aria-label={`${project.name}, the story`} className="absolute inset-x-0 top-0">
        {beats.map((bt, i) => {
          const open = beat === i;
          const done = i < beat;
          return (
            <li key={bt.key} className="relative pl-5">
              <Segment pin={pin} i={i} a={a} b={b} />
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={id(bt.key)}
                  aria-current={open ? "step" : undefined}
                  onClick={() => onPick(i)}
                  className="group/beat flex h-10 w-full items-center gap-3 rounded-lg text-left [@media(min-height:860px)]:h-11"
                >
                  <span
                    className="w-7 text-[12.5px] tabular-nums transition-colors duration-500"
                    style={{ color: open ? a : done ? "var(--text-2)" : "var(--text-3)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`origin-left whitespace-nowrap text-[21px] font-medium tracking-[-0.015em] transition-[transform,color] ${
                      open ? "text-text" : "text-text-3 group-hover/beat:text-text-2"
                    }`}
                    style={{ transform: open ? "none" : "scale(0.74)", transitionDuration: `${DUR}ms`, transitionTimingFunction: EASE }}
                  >
                    {bt.label}
                  </span>
                </button>
              </h3>
              <div
                id={id(bt.key)}
                inert={!open}
                className="grid"
                style={{
                  gridTemplateRows: open ? "1fr" : "0fr",
                  transition: `grid-template-rows ${DUR}ms ${EASE}`,
                }}
              >
                <div
                  className="min-h-0 overflow-hidden"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? "none" : "translateY(-6px)",
                    filter: open ? "none" : "blur(3px)",
                    transition: open
                      ? `opacity ${DUR}ms ${EASE} 120ms, transform ${DUR}ms ${EASE} 120ms, filter ${DUR}ms ${EASE} 120ms`
                      : `opacity 260ms ease-out, transform 260ms ease-out, filter 260ms ease-out`,
                  }}
                >
                  <p className={`${bodyPad} ${para}`}>{project.story[bt.key]}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" aria-live="polite">
        {`${beats[beat].label}: ${project.story[beats[beat].key]}`}
      </p>
    </div>
  );
}

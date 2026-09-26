"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check } from "lucide-react";
import { stepStarts, steps } from "./data";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DUR = 620;
const para = "text-[15.5px] leading-[1.6] text-[#c9cbd0] [@media(min-height:860px)]:text-[16.5px]";
const bodyPad = "pb-4 pl-[3.25rem] pr-2 pt-0.5";
const row = "h-12 [@media(min-height:860px)]:h-[52px]";

/** A numbered stop on the rail: upcoming, current (glowing) or done (ticked). */
export function Node({ i, state, reduced = false }: { i: number; state: "todo" | "now" | "done"; reduced?: boolean }) {
  const a = steps[i].accent;
  return (
    <span className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center">
      {state === "now" && !reduced && (
        <span className="absolute inset-0 animate-ping rounded-full opacity-25" style={{ background: a, animationDuration: "2.6s" }} aria-hidden="true" />
      )}
      <span
        className="relative flex h-full w-full items-center justify-center rounded-full border text-[12.5px] font-medium tabular-nums transition-[background-color,border-color,color,box-shadow] duration-500"
        style={{
          borderColor: state === "todo" ? "rgba(255,255,255,0.14)" : a,
          background: state === "done" ? a : state === "now" ? `color-mix(in oklab, ${a} 16%, #0b0c0e)` : "#0b0c0e",
          color: state === "todo" ? "var(--text-3)" : a,
          boxShadow: state === "now" ? `0 0 24px -4px ${a}` : "none",
        }}
      >
        {state === "done" ? <Check className="h-4 w-4 text-black" strokeWidth={2.6} aria-hidden="true" /> : String(i + 1).padStart(2, "0")}
      </span>
    </span>
  );
}

/** The line from one stop to the next, filling with scroll through that step. */
function Connector({ pin, i }: { pin: MotionValue<number>; i: number }) {
  const fill = useTransform(pin, [stepStarts[i], stepStarts[i + 1]], [0, 1], { clamp: true });
  const a = steps[i].accent;
  const b = steps[i + 1].accent;
  return (
    <span aria-hidden="true" className="absolute bottom-[-5px] left-[16px] top-[43px] w-[2px] overflow-hidden rounded-full bg-white/[0.08] [@media(min-height:860px)]:bottom-[-7px] [@media(min-height:860px)]:top-[45px]">
      <motion.span className="absolute inset-0 origin-top rounded-full" style={{ scaleY: fill, background: `linear-gradient(to bottom, ${a}, ${b})` }} />
    </span>
  );
}

/**
 * The four steps on a vertical rail. The current one opens its sentence; the
 * others fold to their name. An invisible twin reserves "four names + the
 * longest sentence", so nothing outside the rail moves while steps change.
 */
export default function Rail({ step, onPick, pin, reduced }: { step: number; onPick: (i: number) => void; pin: MotionValue<number>; reduced: boolean }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="invisible">
        {steps.map((s, i) => (
          <div key={s.key}>
            <div className={row} />
            {i === 0 && (
              <div className={`grid ${bodyPad}`}>
                {steps.map((x) => (
                  <p key={x.key} className={`col-start-1 row-start-1 ${para}`}>
                    {x.body}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ol aria-label="How a project runs" className="absolute inset-x-0 top-0">
        {steps.map((s, i) => {
          const open = step === i;
          const state = i < step ? "done" : open ? "now" : "todo";
          return (
            <li key={s.key} className="relative">
              {i < steps.length - 1 && <Connector pin={pin} i={i} />}
              <h3 className="m-0">
                <button
                  type="button"
                  aria-current={open ? "step" : undefined}
                  aria-controls={`process-step-${s.key}`}
                  aria-expanded={open}
                  onClick={() => onPick(i)}
                  className={`group/step flex w-full items-center gap-[1.125rem] rounded-xl text-left ${row}`}
                >
                  <Node i={i} state={state} reduced={reduced} />
                  <span
                    className={`origin-left whitespace-nowrap text-[clamp(1.35rem,1.9vw,1.6rem)] font-medium tracking-[-0.02em] transition-[transform,color] ${
                      open ? "text-text" : state === "done" ? "text-text-2 group-hover/step:text-text" : "text-text-3 group-hover/step:text-text-2"
                    }`}
                    style={{ transform: open ? "none" : "scale(0.8)", transitionDuration: `${DUR}ms`, transitionTimingFunction: EASE }}
                  >
                    {s.name}
                  </span>
                </button>
              </h3>
              <div
                id={`process-step-${s.key}`}
                inert={!open}
                className="grid"
                style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: `grid-template-rows ${DUR}ms ${EASE}` }}
              >
                <div
                  className="min-h-0 overflow-hidden"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? "none" : "translateY(-6px)",
                    filter: open ? "none" : "blur(3px)",
                    transition: open
                      ? `opacity ${DUR}ms ${EASE} 120ms, transform ${DUR}ms ${EASE} 120ms, filter ${DUR}ms ${EASE} 120ms`
                      : "opacity 260ms ease-out, transform 260ms ease-out, filter 260ms ease-out",
                  }}
                >
                  <p className={`${bodyPad} ${para}`}>{s.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" aria-live="polite">
        {`Step ${step + 1} of ${steps.length}, ${steps[step].name}: ${steps[step].body}`}
      </p>
    </div>
  );
}

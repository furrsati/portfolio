"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion } from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript, type DemoStep } from "../useAutoDemo";

/* Furrsati: teal light, orange accent. The light tints keep small text and dots legible on near-black. */
const TEAL = "#05696B";
const TEAL_LIGHT = "#45C9C5";
const ORANGE = "#FAA21B";
const CORAL = "#FF806F";
const INK_ON_ORANGE = "#1c1204";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;

/** Simulated database commit. Nothing leaves the server before this resolves. */
const COMMIT_MS = 350;
/** The socket event travelling to the other phone, emitted only after the commit. */
const EMIT_MS = 280;
/** Incoming indicator on the freelancer's phone before the text lands. */
const TYPING_MS = 560;
/** Delivery receipt travelling back to the sender. */
const ACK_MS = 240;
const MAX_LEN = 60;
const MAX_MSGS = 8;

const SEED = "Milestone 1 is ready for review.";
/** What the auto demo types: a reply that goes through, then an approval that dies before its commit. */
const DEMO_OK = "Perfect, thanks!";
const DEMO_CRASH = "Approved.";
const SUGGESTIONS = ["Looks great!", "Approved. Thank you.", "ممتاز، شكراً!", "Send the final files?"];
const ARABIC = /[؀-ۿ]/;

const FRAME_BG = "linear-gradient(160deg, #2b2d32, #111215 45%, #1c1d21)";
const FRAME_SHADOW = "0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px -18px rgba(0,0,0,0.9)";
const SCREEN_BG = "radial-gradient(130% 55% at 50% 0%, rgba(5,105,107,0.24), transparent 62%), #060708";

/** Phones sit side by side from this container width (see the literal @min-[256px] classes below). */
const THREAD =
  "flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2 pb-1.5 pt-2 [mask-image:linear-gradient(to_bottom,transparent_0,#000_16px)]";

type Stage = "saving" | "saved" | "delivered" | "failed";
type Peer = "none" | "typing" | "arrived";
type Msg = { id: number; text: string; stage: Stage; peer: Peer };
type Lit = "off" | "on" | "fail" | "fade";
type DbState = "idle" | "writing" | "committed" | "crashed";
type Tone = "muted" | "busy" | "ok" | "bad";
type Status = { text: string; tone: Tone };

const STATUS: Record<Stage, Status> = {
  saving: { text: "Saving to Postgres…", tone: "busy" },
  saved: { text: "Committed. Only now does it go out.", tone: "busy" },
  delivered: { text: "Delivered, after the commit.", tone: "ok" },
  failed: { text: "Not saved. Nothing was sent.", tone: "bad" },
};

const TONE_COLOR: Record<Tone, string> = {
  muted: "var(--text-2)",
  busy: "var(--text-2)",
  ok: "var(--text)",
  bad: CORAL,
};

const DB_LABEL: Record<DbState, string> = {
  idle: "Postgres",
  writing: "Writing",
  committed: "Committed",
  crashed: "Crashed",
};

const DB_COLOR: Record<DbState, string> = {
  idle: "rgba(255,255,255,0.16)",
  writing: ORANGE,
  committed: TEAL_LIGHT,
  crashed: CORAL,
};

/* -------------------------------------------------------------------------- */
/* Bubbles                                                                    */
/* -------------------------------------------------------------------------- */

const OWN_RADIUS: CSSProperties = {
  borderTopLeftRadius: 13,
  borderTopRightRadius: 13,
  borderBottomLeftRadius: 13,
  borderBottomRightRadius: 5,
};
const IN_RADIUS: CSSProperties = {
  borderTopLeftRadius: 13,
  borderTopRightRadius: 13,
  borderBottomLeftRadius: 5,
  borderBottomRightRadius: 13,
};

function textClass(text: string) {
  return ARABIC.test(text) ? "font-arabic text-[12.5px] leading-[1.35]" : "text-[11.5px] leading-[1.3]";
}

function StaticBubble({ own, children }: { own: boolean; children: string }) {
  return (
    <span
      dir="auto"
      className={`block min-w-0 max-w-[88%] px-2.5 py-[5px] [overflow-wrap:anywhere] ${textClass(children)}`}
      style={
        own
          ? { ...OWN_RADIUS, background: ORANGE, color: INK_ON_ORANGE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }
          : { ...IN_RADIUS, background: "rgba(255,255,255,0.08)", color: "var(--text)" }
      }
    >
      {children}
    </span>
  );
}

function Check({ double }: { double?: boolean }) {
  return (
    <svg viewBox="0 0 14 10" className="h-[9px] w-[13px] shrink-0" fill="none" aria-hidden="true">
      <path d="M1 5.2 3.6 7.8 8.4 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {double && (
        <path d="M6.6 7.4 7 7.8 11.8 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function Meta({ stage, reduced }: { stage: Stage; reduced: boolean }) {
  let icon: ReactNode = null;
  let label = "";
  let color = "var(--text-3)";
  switch (stage) {
    case "saving":
      label = "Saving…";
      icon = (
        <motion.svg
          viewBox="0 0 10 10"
          className="h-[9px] w-[9px] shrink-0"
          aria-hidden="true"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
        >
          <circle cx="5" cy="5" r="3.8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" />
          <path d="M5 1.2a3.8 3.8 0 0 1 3.8 3.8" fill="none" stroke={ORANGE} strokeWidth="1.4" strokeLinecap="round" />
        </motion.svg>
      );
      break;
    case "saved":
      label = "Saved";
      color = "var(--text-2)";
      icon = <Check />;
      break;
    case "delivered":
      label = "Delivered";
      color = TEAL_LIGHT;
      icon = <Check double />;
      break;
    case "failed":
      label = "Not saved. Nothing was sent.";
      color = CORAL;
      break;
  }
  return (
    <motion.span
      key={stage}
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="mt-[3px] flex max-w-full items-center justify-end gap-1 pr-0.5 text-right text-[10px] leading-[1.25]"
      style={{ color }}
    >
      {icon}
      {label}
    </motion.span>
  );
}

function ClientItem({ m, last, reduced }: { m: Msg; last: boolean; reduced: boolean }) {
  const failed = m.stage === "failed";
  // Like any chat app: receipts only under the newest message, but never hide one that is in flight or failed.
  const showMeta = last || m.stage !== "delivered";
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: reduced ? 0 : 0.26, ease: [0.4, 0, 1, 1] } }}
      transition={SPRING}
      style={{ originX: 1, originY: 1 }}
      className="flex flex-col items-end"
    >
      <div className="flex max-w-[94%] items-center justify-end gap-1">
        {failed && (
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none"
            style={{ background: CORAL, color: "#1a0806" }}
          >
            !
          </motion.span>
        )}
        <motion.span
          dir="auto"
          className={`block min-w-0 border border-dashed px-2.5 py-[5px] [overflow-wrap:anywhere] ${textClass(m.text)}`}
          style={{ ...OWN_RADIUS, boxShadow: failed ? "none" : "inset 0 1px 0 rgba(255,255,255,0.35)" }}
          initial={false}
          animate={{
            opacity: m.stage === "saving" ? 0.7 : 1,
            backgroundColor: failed ? "rgba(255,128,111,0.07)" : ORANGE,
            color: failed ? "#d8d4cf" : INK_ON_ORANGE,
            borderColor: failed ? "rgba(255,128,111,0.65)" : "rgba(250,162,27,0)",
            x: failed && !reduced ? [0, -4, 4, -2.5, 2.5, 0] : 0,
          }}
          transition={{ duration: reduced ? 0 : 0.22, x: { duration: 0.42, ease: "easeInOut" } }}
        >
          {m.text}
        </motion.span>
      </div>
      {showMeta && <Meta stage={m.stage} reduced={reduced} />}
    </motion.li>
  );
}

function Dots({ reduced }: { reduced: boolean }) {
  return (
    <span className="flex h-[15px] items-center gap-[3px] px-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-[5px] w-[5px] rounded-full bg-text-2"
          animate={reduced ? { opacity: 0.75 } : { y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
          transition={reduced ? { duration: 0 } : { duration: 0.8, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function PeerItem({ m, reduced }: { m: Msg; reduced: boolean }) {
  const typing = m.peer === "typing";
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.55, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: reduced ? 0 : 0.26, ease: [0.4, 0, 1, 1] } }}
      transition={SPRING}
      style={{ originX: 0, originY: 1 }}
      className="flex justify-start"
    >
      <motion.span
        layout
        transition={SPRING}
        dir="auto"
        className={`block min-w-0 max-w-[88%] px-2.5 py-[5px] text-text [overflow-wrap:anywhere] ${textClass(m.text)}`}
        style={{ ...IN_RADIUS, background: "rgba(255,255,255,0.08)" }}
      >
        {typing ? (
          <>
            <Dots reduced={reduced} />
            <span className="sr-only">Incoming message</span>
          </>
        ) : (
          <motion.span
            layout
            className="block"
            initial={{ opacity: 0, filter: reduced ? "blur(0px)" : "blur(3px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: reduced ? 0 : 0.28 }}
          >
            {m.text}
          </motion.span>
        )}
      </motion.span>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

const AVATAR: Record<"Client" | "Freelancer", CSSProperties> = {
  Client: { background: `linear-gradient(160deg, #FFC45E, ${ORANGE})`, color: INK_ON_ORANGE },
  Freelancer: { background: `linear-gradient(160deg, #0B8C8E, ${TEAL})`, color: "#EFFFFE" },
};

function Phone({
  owner,
  peer,
  ping,
  pingColor,
  reduced,
  children,
}: {
  owner: "Client" | "Freelancer";
  peer: "Client" | "Freelancer";
  ping: number;
  pingColor: string;
  reduced: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full @min-[256px]:max-w-[176px]">
      <p className="truncate px-1 text-[12px] leading-none">
        <span className="font-medium text-text">{owner}</span>
        <span className="text-text-3">’s phone</span>
      </p>

      <div
        className="relative mt-2 flex h-[204px] flex-col rounded-[22px] p-[3px] @min-[256px]:aspect-[10/19] @min-[256px]:h-auto"
        style={{ background: FRAME_BG, boxShadow: FRAME_SHADOW }}
      >
        {ping > 0 && !reduced && (
          <motion.span
            key={ping}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-[22px]"
            style={{ boxShadow: `0 0 0 1px ${pingColor}, 0 0 30px -4px ${pingColor}` }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        )}
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[19px]"
          style={{ background: SCREEN_BG }}
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[6px] z-10 h-[6px] w-[30px] -translate-x-1/2 rounded-full bg-black"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }}
          />
          {/* Chat header: who this phone is talking to, and their presence */}
          <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2.5 pb-[7px] pt-[19px]">
            <span
              aria-hidden="true"
              className="relative grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full text-[9.5px] font-semibold leading-none"
              style={AVATAR[peer]}
            >
              {peer[0]}
              <span
                className="absolute -bottom-px -right-px h-[7px] w-[7px] rounded-full"
                style={{ background: TEAL_LIGHT, boxShadow: `0 0 0 1.5px #07090a, 0 0 6px ${TEAL_LIGHT}` }}
              />
            </span>
            <span className="min-w-0 leading-none">
              <span className="sr-only">Chat with </span>
              <span className="block truncate text-[10.5px] font-medium text-text">{peer}</span>
              <span className="mt-[3px] block text-[9.5px]" style={{ color: TEAL_LIGHT }}>
                online
              </span>
            </span>
          </div>
          {children}
          <span aria-hidden="true" className="mx-auto mb-[5px] mt-1.5 h-[3px] w-[34px] shrink-0 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}

function Composer({
  value,
  suggestion,
  sent,
  typing,
  onChange,
  onSubmit,
}: {
  value: string;
  suggestion: string;
  sent: number;
  /** The auto demo has "focused" the field: show the focus ring and a caret, like a real person typing. */
  typing: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const arabic = ARABIC.test(value || suggestion);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="shrink-0 px-1.5 pt-1">
      <div
        data-typing={typing ? "on" : undefined}
        className="relative h-10 rounded-full bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_rgba(250,162,27,0.7),0_0_0_3px_rgba(250,162,27,0.16)] data-[typing=on]:shadow-[inset_0_0_0_1px_rgba(250,162,27,0.7),0_0_0_3px_rgba(250,162,27,0.16)]"
      >
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <span id={hintId} className="sr-only">
          Leave it empty to send the suggested reply.
        </span>
        {/* 16px text scaled to 12px: keeps iOS from zooming the page on focus. */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <input
            id={inputId}
            type="text"
            // Typed text picks its own direction; an Arabic suggestion reads right to left.
            dir={value ? "auto" : arabic ? "rtl" : "ltr"}
            value={value}
            maxLength={MAX_LEN}
            autoComplete="off"
            enterKeyHint="send"
            placeholder={suggestion}
            aria-describedby={hintId}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className={`absolute left-0 top-1/2 h-[53.333px] w-[133.333%] origin-left -translate-y-1/2 scale-75 bg-transparent pl-4 pr-[58px] text-[16px] placeholder:text-[#8d9097] focus-visible:outline-none ${
              typing ? "text-transparent" : "text-text"
            } ${arabic ? "font-arabic" : ""}`}
          />
          {/* The demo's typing, drawn over the field: the text keeps its end in view and a caret follows it. */}
          {typing && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-1/2 h-[53.333px] w-[133.333%] origin-left -translate-y-1/2 scale-75 pl-4 pr-[58px] text-[16px]"
            >
              <div className="flex h-full items-center justify-end overflow-hidden">
                <div className="flex min-w-full flex-none items-center whitespace-pre text-text">
                  {value}
                  <motion.span
                    key={value.length}
                    className="ml-px h-[19px] w-[2px] shrink-0 rounded-full"
                    style={{ background: ORANGE }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 1, 0, 0] }}
                    transition={{ duration: 1.06, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear", delay: 0.4 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <motion.button
          type="button"
          aria-label="Send"
          data-demo="send"
          onClick={onSubmit}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.86 }}
          transition={SPRING}
          className="absolute right-0 top-0 grid h-10 w-10 place-items-center"
          // Inline so it wins over the global :focus-visible ring: keep that ring round and hugging the button.
          style={{ borderRadius: 9999, outlineOffset: -3 }}
        >
          <span
            className="grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(180deg, #FFC45E, ${ORANGE})`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 16px -6px rgba(250,162,27,0.9)",
            }}
          >
            <motion.svg
              key={sent}
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              aria-hidden="true"
              initial={sent === 0 ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={SPRING}
            >
              <path
                d="M8 13V3.6M3.9 7.6 8 3.4l4.1 4.2"
                stroke={INK_ON_ORANGE}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </span>
        </motion.button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The wire: client -> Postgres -> freelancer                                 */
/* -------------------------------------------------------------------------- */

function Segment({
  axis,
  shape,
  style,
  state,
  color,
  seconds,
  reduced,
}: {
  axis: "x" | "y";
  shape: string;
  style?: CSSProperties;
  state: Lit;
  color: string;
  seconds: number;
  reduced: boolean;
}) {
  // Negative insets leave room for the glow; the large far inset hides the whole line.
  const hidden = axis === "x" ? "inset(-6px 150% -6px -6px)" : "inset(-6px -6px 150% -6px)";
  const shown = "inset(-6px -6px -6px -6px)";
  const tone = state === "fail" ? CORAL : color;
  return (
    <>
      <span className={`absolute border-white/[0.12] ${shape}`} style={style} />
      <motion.span
        className={`absolute ${shape}`}
        style={{ ...style, filter: `drop-shadow(0 0 3px ${tone})` }}
        initial={{ clipPath: hidden, opacity: 1, borderColor: color }}
        animate={{
          clipPath: state === "off" ? hidden : shown,
          opacity: state === "fade" || state === "fail" ? 0 : 1,
          borderColor: tone,
        }}
        transition={{
          clipPath: { duration: reduced ? 0 : seconds, ease: [0.45, 0, 0.2, 1] },
          borderColor: { duration: reduced ? 0 : 0.15 },
          opacity: {
            duration: reduced ? 0 : 0.5,
            delay: reduced ? 0 : state === "fail" ? 0.7 : state === "fade" ? 0.25 : 0,
          },
        }}
      />
    </>
  );
}

function DbNode({ state, armed, runId, reduced }: { state: DbState; armed: boolean; runId: number; reduced: boolean }) {
  const ring = DB_COLOR[state];
  const icon = state === "committed" ? "check" : state === "crashed" ? "x" : "db";
  return (
    <motion.div
      className="relative grid h-7 w-7 place-items-center rounded-full bg-[#0c0e10]"
      initial={false}
      animate={{
        boxShadow:
          state === "idle"
            ? `inset 0 0 0 1px ${ring}, 0 0 0px 0px rgba(0,0,0,0)`
            : `inset 0 0 0 1px ${ring}, 0 0 16px -3px ${ring}`,
        x: state === "crashed" && !reduced ? [0, -3, 3, -2, 2, 0] : 0,
        scale: state === "committed" && !reduced ? [1, 1.16, 1] : 1,
      }}
      transition={{ duration: reduced ? 0 : 0.25, x: { duration: 0.4 }, scale: { duration: 0.35 } }}
    >
      {armed && state !== "crashed" && (
        <span
          className="absolute -left-[5px] -top-[5px] h-[38px] w-[38px] rounded-full border border-dashed"
          style={{ borderColor: "rgba(255,128,111,0.6)" }}
        />
      )}
      {state === "writing" && (
        <motion.svg
          viewBox="0 0 34 34"
          className="absolute -left-[3px] -top-[3px] h-[34px] w-[34px]"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        >
          <path d="M17 2a15 15 0 0 1 15 15" fill="none" stroke={ORANGE} strokeWidth="1.6" strokeLinecap="round" />
        </motion.svg>
      )}
      {!reduced && (state === "committed" || state === "crashed") && (
        <motion.span
          key={`${state}-${runId}`}
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 1.5px ${ring}` }}
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <AnimatePresence initial={false}>
        <motion.span
          key={icon}
          className="absolute inset-0 grid place-items-center"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={SPRING}
          style={{ color: state === "idle" ? "var(--text-2)" : ring }}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {icon === "db" && (
              <>
                <ellipse cx="8" cy="4" rx="5" ry="2" />
                <path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4" />
                <path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
              </>
            )}
            {icon === "check" && <path d="M3.5 8.4 6.6 11.4 12.6 4.8" strokeWidth="1.9" />}
            {icon === "x" && <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" strokeWidth="1.9" />}
          </svg>
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

function Wire({
  axis,
  runId,
  a,
  b,
  db,
  armed,
  reduced,
  className,
}: {
  axis: "x" | "y";
  runId: number;
  a: Lit;
  b: Lit;
  db: DbState;
  armed: boolean;
  reduced: boolean;
  className: string;
}) {
  const x = axis === "x";
  const labelColor = db === "idle" ? "var(--text-3)" : DB_COLOR[db];
  return (
    <div aria-hidden="true" className={`relative ${x ? "h-12" : "h-[50px]"} ${className}`}>
      {/* Phone columns are split by a 10px gap, so their centres sit 2.5px inside the quarter lines. */}
      <Segment
        key={`a-${runId}`}
        axis={axis}
        shape={x ? "top-0 h-4 rounded-bl-[10px] border-b border-l" : "left-1/2 top-0 h-1/2 w-0 border-l"}
        style={x ? { left: "calc(25% - 2.5px)", right: "50%" } : undefined}
        state={a}
        color={ORANGE}
        seconds={(COMMIT_MS - 70) / 1000}
        reduced={reduced}
      />
      <Segment
        key={`b-${runId}`}
        axis={axis}
        shape={x ? "top-0 h-4 rounded-br-[10px] border-b border-r" : "left-1/2 top-1/2 h-1/2 w-0 border-l"}
        style={x ? { left: "50%", right: "calc(25% - 2.5px)" } : undefined}
        state={b}
        color={TEAL_LIGHT}
        seconds={EMIT_MS / 1000}
        reduced={reduced}
      />
      <div className={`absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${x ? "top-4" : "top-1/2"}`}>
        <DbNode state={db} armed={armed} runId={runId} reduced={reduced} />
      </div>
      <span
        className={`absolute whitespace-nowrap text-[10.5px] leading-none transition-colors duration-200 ${
          x ? "left-1/2 top-[35px] -translate-x-1/2" : "left-[calc(50%+26px)] top-1/2 -translate-y-1/2"
        }`}
        style={{ color: labelColor }}
      >
        {DB_LABEL[db]}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function RealtimeTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  const [rootScope, animateRoot] = useAnimate<HTMLDivElement>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [crash, setCrash] = useState(false);
  const [note, setNote] = useState<Status | null>(null);
  const [live, setLive] = useState("");
  const [arrivedPing, setArrivedPing] = useState(0);
  const [failedPing, setFailedPing] = useState(0);
  /* Composer */
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState(0);
  const [sent, setSent] = useState(0);
  const [draftByDemo, setDraftByDemo] = useState(false);
  const [typing, setTyping] = useState(false);
  const crashRef = useRef(false);
  const idRef = useRef(0);
  const timers = useRef<Set<number>>(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  const later = (ms: number, fn: () => void) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  const announce = (text: string) => setLive((prev) => (prev === text ? `${text} ` : text));

  const send = (raw: string) => {
    const text = raw.slice(0, MAX_LEN);
    const id = ++idRef.current;
    // The crash switch is read when the message is sent: this write is doomed or it isn't.
    const willCrash = crashRef.current;
    const patch = (p: Partial<Msg>) => {
      setNote(null);
      setMsgs((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)));
    };

    setNote(null);
    setMsgs((list) => [...list, { id, text, stage: "saving" as const, peer: "none" as const }].slice(-MAX_MSGS));

    later(COMMIT_MS, () => {
      if (willCrash) {
        patch({ stage: "failed" });
        setFailedPing(id);
        announce("Not saved. Nothing was sent.");
        return;
      }
      // Committed. Only now is the realtime event emitted.
      patch({ stage: "saved" });
      later(EMIT_MS, () => {
        patch({ peer: "typing" });
        later(TYPING_MS, () => {
          patch({ peer: "arrived" });
          setArrivedPing(id);
          later(ACK_MS, () => {
            patch({ stage: "delivered" });
            announce(`Delivered to the freelancer: ${text}`);
          });
        });
      });
    });
  };

  const toggleCrash = () => {
    const next = !crashRef.current;
    crashRef.current = next;
    setCrash(next);
    setNote(
      next
        ? { text: "The next save will crash before it commits.", tone: "bad" }
        : { text: "Saves commit again. Try sending.", tone: "muted" },
    );
  };

  const suggestion = SUGGESTIONS[pick % SUGGESTIONS.length];
  // Half a sentence the demo was typing is not the visitor's: once the demo stops, the field is theirs and empty.
  const value = draftByDemo && !demoActive ? "" : draft;
  const typingNow = typing && demoActive;

  const editDraft = (text: string) => {
    setDraft(text);
    setDraftByDemo(false);
  };

  const submit = () => {
    const typed = value.trim();
    send(typed || suggestion);
    setDraft("");
    setDraftByDemo(false);
    setSent((n) => n + 1);
    if (!typed) setPick((p) => p + 1);
  };

  /** A fresh conversation: the thread fades out, the switch is off, the field is empty. */
  const resetChat = () => {
    crashRef.current = false;
    setCrash(false);
    setNote(null);
    setMsgs([]);
    setDraft("");
    setDraftByDemo(false);
  };

  /* ---------------------------------------------------------------------- */
  /* Auto demo: a client replies, then tries to approve through a crash      */
  /* ---------------------------------------------------------------------- */

  const api = useRef<{ submit: () => void; toggleCrash: () => void; reset: () => void } | null>(null);
  useEffect(() => {
    api.current = { submit, toggleCrash, reset: resetChat };
  });

  const dirty = useRef(false);
  const typer = useRef(0);

  const stopTyping = () => {
    window.clearTimeout(typer.current);
    typer.current = 0;
  };

  // Scrolling away or taking over stops the typing hand at once.
  useEffect(() => {
    if (!demoActive) return;
    return stopTyping;
  }, [demoActive]);

  /** Types `text` into the composer a key at a time, at a human, slightly uneven pace. */
  const typeOut = (text: string) => {
    stopTyping();
    dirty.current = true;
    setTyping(true);
    setDraftByDemo(true);
    setDraft("");
    let n = 0;
    const key = () => {
      n += 1;
      setDraft(text.slice(0, n));
      typer.current = n < text.length ? window.setTimeout(key, 34 + Math.random() * 30) : 0;
    };
    typer.current = window.setTimeout(key, 260);
  };

  const press = (selector: string, scale: number) => {
    if (!rootScope.current) return;
    animateRoot(selector, { scale: [1, scale, 1] }, { duration: 0.3, ease: [0.22, 1, 0.36, 1] });
  };

  const prepare = () => {
    stopTyping();
    setTyping(false);
    if (!dirty.current) return;
    dirty.current = false;
    api.current?.reset();
  };

  const demoSteps: DemoStep[] = [
    { at: 0, run: prepare },
    { at: 700, run: () => typeOut(DEMO_OK) },
    {
      at: 2000,
      run: () => {
        press(`[data-demo="send"]`, 0.86);
        api.current?.submit();
      },
    },
    { at: 2600, run: () => setTyping(false) },
    // Try to break it: the next save will die before its commit.
    {
      at: 4500,
      run: () => {
        dirty.current = true;
        press(`[data-demo="crash"]`, 0.9);
        api.current?.toggleCrash();
      },
    },
    { at: 5500, run: () => typeOut(DEMO_CRASH) },
    {
      at: 6500,
      run: () => {
        press(`[data-demo="send"]`, 0.86);
        api.current?.submit();
      },
    },
    { at: 7100, run: () => setTyping(false) },
    // Nothing reached the freelancer. Switch the crash back off and leave it ready to try.
    {
      at: 9000,
      run: () => {
        press(`[data-demo="crash"]`, 0.9);
        api.current?.toggleCrash();
      },
    },
  ];

  useDemoScript(demoActive, demoSteps, { loop: true, loopDelay: 3600, reset: prepare });

  const latest = msgs.length ? msgs[msgs.length - 1] : undefined;
  const runId = latest?.id ?? 0;

  const db: DbState = !latest
    ? "idle"
    : latest.stage === "saving"
      ? "writing"
      : latest.stage === "saved"
        ? "committed"
        : latest.stage === "failed"
          ? "crashed"
          : "idle";
  const wireA: Lit = !latest ? "off" : latest.stage === "failed" ? "fail" : latest.stage === "delivered" ? "fade" : "on";
  const wireB: Lit =
    !latest || latest.stage === "saving" || latest.stage === "failed"
      ? "off"
      : latest.stage === "delivered"
        ? "fade"
        : "on";

  const status: Status =
    note ?? (latest ? STATUS[latest.stage] : { text: "Send one, then turn on the crash and send another.", tone: "muted" });

  const wire = { runId, a: wireA, b: wireB, db, armed: crash, reduced };

  return (
    <Tile
      glow={TEAL}
      skill="Realtime"
      from="Furrsati"
      title="Messages arrive the moment they're saved, and never before."
      className={className}
      ref={demoRef}
      demo={demoActive}
    >
      <MotionConfig reducedMotion="user">
        <div ref={rootScope} className="@container flex flex-1 flex-col">
          <div className="grid grid-cols-1 @min-[256px]:grid-cols-2 @min-[256px]:gap-x-2.5">
            <Phone owner="Client" peer="Freelancer" ping={failedPing} pingColor={CORAL} reduced={reduced}>
              <ol aria-label="Client's chat" className={THREAD}>
                <motion.li layout="position" transition={SPRING} className="flex justify-start">
                  <StaticBubble own={false}>{SEED}</StaticBubble>
                </motion.li>
                <AnimatePresence initial={false}>
                  {msgs.map((m) => (
                    <ClientItem key={m.id} m={m} last={m.id === runId} reduced={reduced} />
                  ))}
                </AnimatePresence>
              </ol>
              <Composer
                value={value}
                suggestion={suggestion}
                sent={sent}
                typing={typingNow}
                onChange={editDraft}
                onSubmit={submit}
              />
            </Phone>

            <Wire axis="y" className="@min-[256px]:hidden" {...wire} />

            <Phone owner="Freelancer" peer="Client" ping={arrivedPing} pingColor={TEAL_LIGHT} reduced={reduced}>
              <ol aria-label="Freelancer's chat" className={THREAD}>
                <motion.li layout="position" transition={SPRING} className="flex justify-end">
                  <StaticBubble own>{SEED}</StaticBubble>
                </motion.li>
                <AnimatePresence initial={false}>
                  {msgs
                    .filter((m) => m.peer !== "none")
                    .map((m) => (
                      <PeerItem key={m.id} m={m} reduced={reduced} />
                    ))}
                </AnimatePresence>
              </ol>
            </Phone>

            <Wire axis="x" className="hidden @min-[256px]:col-span-2 @min-[256px]:block" {...wire} />
          </div>

          <div className="min-h-3 flex-1" />

          <p className="flex min-h-[2.7em] items-start text-[13px] leading-[1.35]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status.text}
                className="inline-flex items-baseline gap-2"
                style={{ color: TONE_COLOR[status.tone] }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
              >
                {(status.tone === "ok" || status.tone === "bad") && (
                  <span
                    aria-hidden="true"
                    className="relative top-[-1px] h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{
                      background: status.tone === "ok" ? TEAL_LIGHT : CORAL,
                      boxShadow: `0 0 10px ${status.tone === "ok" ? TEAL_LIGHT : CORAL}`,
                    }}
                  />
                )}
                {status.text}
              </motion.span>
            </AnimatePresence>
          </p>

          <button
            type="button"
            aria-pressed={crash}
            onClick={toggleCrash}
            className="group mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl text-left text-[13px]"
          >
            <span
              className={crash ? "" : "text-text-2 transition-colors group-hover:text-text"}
              style={crash ? { color: CORAL } : undefined}
            >
              Crash before commit
            </span>
            <span
              aria-hidden="true"
              data-demo="crash"
              className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-[background-color,box-shadow] duration-200"
              style={{
                background: crash ? "rgba(255,128,111,0.22)" : "rgba(255,255,255,0.07)",
                boxShadow: `inset 0 0 0 1px ${crash ? "rgba(255,128,111,0.7)" : "rgba(255,255,255,0.16)"}`,
              }}
            >
              <motion.span
                className="absolute left-[3px] top-[3px] grid h-4 w-4 place-items-center rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                initial={false}
                animate={{ x: crash ? 16 : 0, backgroundColor: crash ? CORAL : "#d3d5da" }}
                transition={SPRING}
              >
                <motion.svg
                  viewBox="0 0 10 10"
                  className="h-2.5 w-2.5"
                  initial={false}
                  animate={{ opacity: crash ? 1 : 0, scale: crash ? 1 : 0.5 }}
                  transition={SPRING}
                >
                  <path d="M5.8 0.8 2.2 5.6h2.4L4 9.2l3.8-5H5.3z" fill="#1a0806" />
                </motion.svg>
              </motion.span>
            </span>
          </button>

          <p aria-live={demoActive ? "off" : "polite"} className="sr-only">
            {live}
          </p>
        </div>
      </MotionConfig>
    </Tile>
  );
}

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const EMAIL = "danizein@furrsati.com";
/** The same rule the API applies, so nothing the form accepts bounces off the server. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const budgets = ["Under $5k", "$5k to $15k", "$15k to $40k", "Over $40k", "Not sure yet"];
const modes = [
  ["build", "Build something"],
  ["hire", "I’m hiring"],
] as const;

type Mode = (typeof modes)[number][0];
type State = "idle" | "sending" | "sent" | "error";

/** Links elsewhere on the page ("Send a note", "Start this project") open the brief in the right mode with this event. */
const MODE_EVENT = "contact:mode";

const fieldCls =
  "w-full rounded-2xl border border-line bg-white/[0.03] px-4 text-[16px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-white/30 focus:bg-white/[0.05] aria-[invalid=true]:border-[#ff8a7a]/70";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-[14px] text-text-2">
      {label}
      {children}
    </label>
  );
}

/** Enter on a single-line field moves on to the next one instead of submitting half a brief. */
const next = (to: { current: HTMLElement | null }) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  to.current?.focus();
};

export default function Contact() {
  const reduced = useReducedMotion() ?? false;
  const [mode, setMode] = useState<Mode>("build");
  const [budget, setBudget] = useState<string>("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<"email" | "message" | null>(null);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const form = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sent = state === "sent";

  useEffect(() => {
    const onMode = (e: Event) => {
      const m = (e as CustomEvent<Mode>).detail;
      if (m === "build" || m === "hire") setMode(m);
    };
    window.addEventListener(MODE_EVENT, onMode);
    return () => {
      window.removeEventListener(MODE_EVENT, onMode);
      clearTimeout(copyTimer.current);
    };
  }, []);

  // Once it's sent, bring the confirmation into view and to the screen reader (and put the keyboard away).
  // After "Send another", focus goes back to the top of the fresh form.
  const wasSent = useRef(false);
  useEffect(() => {
    if (sent) sentRef.current?.focus();
    else if (wasSent.current) form.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    wasSent.current = sent;
  }, [sent]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  function pickMode(e: KeyboardEvent<HTMLDivElement>) {
    const i = modes.findIndex(([id]) => id === mode);
    const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const m = modes[(to + modes.length) % modes.length][0];
    setMode(m);
    document.getElementById(`contact-mode-${m}`)?.focus();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    const from = String(payload.email ?? "").trim();
    if (!EMAIL_RE.test(from)) {
      setError(from ? "That email doesn’t look right. Check it so I can reply." : "Add your email so I can reply.");
      setInvalid("email");
      emailRef.current?.focus();
      return;
    }
    if (!String(payload.message ?? "").trim()) {
      setError("Tell me what has to work, even one line.");
      setInvalid("message");
      messageRef.current?.focus();
      return;
    }
    setError("");
    setInvalid(null);
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, email: from, mode, budget: mode === "build" ? budget : "" }),
      });
      if (!res.ok) throw new Error();
      setEmail(from);
      setState("sent");
    } catch {
      setState("error");
    }
  }

  function again() {
    form.current?.reset();
    setBudget("");
    setState("idle");
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] py-28 md:px-[max(2.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] lg:px-16 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(50% 45% at 20% 40%, rgba(250,162,27,.10), transparent 70%), radial-gradient(40% 40% at 85% 70%, rgba(86,86,255,.10), transparent 70%)" }}
      />
      <div className="relative mx-auto grid max-w-[1500px] grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2
            id="contact-title"
            className="max-w-[12ch] text-balance text-[clamp(2.75rem,6.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96]"
          >
            Got something that has to work?
          </h2>
          <p className="mt-6 max-w-[44ch] text-pretty text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.5] text-text-2">
            Payouts, live features, an Arabic app, a store release or an old system to replace. Tell me what can’t fail
            and I’ll reply in English, Arabic or French.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-2 text-[15px] sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={copyEmail}
              aria-label={`Copy email address ${EMAIL}`}
              className="col-span-2 inline-flex h-11 items-center justify-center rounded-full border border-line-strong px-5 text-text transition-[background-color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:bg-white/5 active:scale-[0.98] active:bg-white/[0.08]"
            >
              <span className="grid">
                <span
                  className="col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,transform] duration-300"
                  style={{ opacity: copied ? 0 : 1, transform: copied ? "translateY(-35%)" : "none" }}
                >
                  <Copy className="h-4 w-4 shrink-0 text-text-3" strokeWidth={1.9} aria-hidden="true" />
                  {EMAIL}
                </span>
                <span
                  className="col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,transform] duration-300"
                  style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "translateY(35%)" }}
                  aria-hidden="true"
                >
                  <Check className="h-4 w-4 shrink-0 text-[#6EE7A8]" strokeWidth={2.4} aria-hidden="true" />
                  Copied to clipboard
                </span>
              </span>
            </button>
            <span className="sr-only" aria-live="polite">
              {copied ? "Email address copied" : ""}
            </span>
            <a
              href="https://github.com/furrsati"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-text-2 transition-[background-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:text-text active:scale-[0.98] active:bg-white/[0.06] active:text-text"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/danizein"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-text-2 transition-[background-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:text-text active:scale-[0.98] active:bg-white/[0.06] active:text-text"
            >
              LinkedIn
            </a>
          </div>
          <p className="mt-8 max-w-[44ch] text-pretty text-[14px] leading-relaxed text-text-3">
            No testimonials here. Ask, and I’ll introduce you to the people I built for.
          </p>
        </div>

        {/* The form and the confirmation share one cell, so sending never changes the card's height or moves the page */}
        <div className="grid rounded-[32px] border border-line bg-[#0a0b0d]/80 p-6 backdrop-blur-sm md:p-8">
          <AnimatePresence>
            {sent && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="col-start-1 row-start-1 flex flex-col justify-center"
              >
                <h3 ref={sentRef} tabIndex={-1} className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.02em] outline-none">
                  Sent.
                </h3>
                <p className="mt-3 text-pretty text-[17px] text-text-2">I’ll reply to {email} within a working day.</p>
                <button
                  type="button"
                  onClick={again}
                  className="-ml-1 mt-6 inline-flex h-11 items-center self-start rounded-full px-1 text-[15px] text-text-2 underline underline-offset-4 transition-colors [-webkit-tap-highlight-color:transparent] hover:text-text active:text-text"
                >
                  Send another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            ref={form}
            onSubmit={submit}
            onInput={(e) => {
              if (invalid && (e.target as HTMLInputElement).name === invalid) {
                setInvalid(null);
                setError("");
              }
            }}
            inert={sent}
            className="col-start-1 row-start-1 flex flex-col gap-5"
            // Hides after the fade; shows at once, so focus can land in it straight away.
            style={{ opacity: sent ? 0 : 1, visibility: sent ? "hidden" : "visible", transition: sent ? "opacity 250ms, visibility 0s 250ms" : "opacity 250ms" }}
            noValidate
          >
            <div role="radiogroup" aria-label="What is this about" onKeyDown={pickMode} className="grid grid-cols-2 rounded-full border border-line p-1 text-[14px]">
              {modes.map(([id, label]) => (
                <button
                  key={id}
                  id={`contact-mode-${id}`}
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  tabIndex={mode === id ? 0 : -1}
                  onClick={() => setMode(id)}
                  className="relative h-11 touch-manipulation rounded-full px-3 [-webkit-tap-highlight-color:transparent]"
                >
                  {mode === id && (
                    <motion.span layoutId="mode" className="absolute inset-0 rounded-full bg-text" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 36 }} />
                  )}
                  <span className={`relative transition-colors ${mode === id ? "text-black" : "text-text-2 active:text-text"}`}>{label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <input
                  name="name"
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  onKeyDown={next(emailRef)}
                  className={`${fieldCls} h-12`}
                />
              </Field>
              <Field label="Email">
                <input
                  ref={emailRef}
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  onKeyDown={next(messageRef)}
                  aria-required="true"
                  aria-invalid={invalid === "email"}
                  aria-describedby={invalid === "email" ? "contact-error" : undefined}
                  className={`${fieldCls} h-12`}
                />
              </Field>
            </div>
            <Field label={mode === "build" ? "What has to work?" : "The role"}>
              <textarea
                ref={messageRef}
                name="message"
                rows={4}
                placeholder={mode === "build" ? "The one thing that can’t fail: payouts, live chat, Arabic, a store release…" : "Role, team, remote or on-site, and a link if you have one."}
                aria-required="true"
                aria-invalid={invalid === "message"}
                aria-describedby={invalid === "message" ? "contact-error" : undefined}
                className={`${fieldCls} resize-none py-3`}
              />
            </Field>
            {mode === "build" && (
              <fieldset>
                <legend className="mb-2 text-[14px] text-text-2">Budget</legend>
                <div className="flex flex-wrap gap-2">
                  {budgets.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={budget === b}
                      onClick={() => setBudget(budget === b ? "" : b)}
                      className={`h-11 touch-manipulation rounded-full border px-4 text-[14px] transition-[background-color,border-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] active:scale-[0.96] ${
                        budget === b ? "border-text bg-text text-black" : "border-line text-text-2 hover:text-text active:bg-white/[0.06] active:text-text"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <div id="contact-error" aria-live="polite" className="min-h-[1.25rem] text-pretty text-[14px] text-[#ff8a7a]">
              {error || (state === "error" ? `That didn’t send, but your text is still here. Try again, or email ${EMAIL}.` : "")}
            </div>
            <button
              type="submit"
              disabled={state === "sending"}
              className="h-14 rounded-full bg-text text-[16px] font-medium text-black transition-transform [-webkit-tap-highlight-color:transparent] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : "Send brief"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

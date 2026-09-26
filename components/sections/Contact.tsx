"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const EMAIL = "danizein@furrsati.com";
const budgets = ["Under $5k", "$5k to $15k", "$15k to $40k", "Over $40k", "Not sure yet"];

type State = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [mode, setMode] = useState<"build" | "hire">("build");
  const [budget, setBudget] = useState<string>("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (!String(payload.email).includes("@")) return setError("Add your email so I can reply.");
    if (!String(payload.message).trim()) return setError("Tell me what has to work, even one line.");
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode, budget }),
      });
      if (!res.ok) throw new Error();
      setEmail(String(payload.email));
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative px-5 py-28 md:px-10 lg:px-16 lg:py-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(50% 45% at 20% 40%, rgba(250,162,27,.10), transparent 70%), radial-gradient(40% 40% at 85% 70%, rgba(86,86,255,.10), transparent 70%)" }}
      />
      <div className="relative mx-auto grid max-w-[1500px] grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2
            id="contact-title"
            className="max-w-[12ch] text-[clamp(2.75rem,6.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96]"
          >
            Got something that has to work?
          </h2>
          <p className="mt-6 max-w-[44ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.5] text-text-2">
            Payouts, live features, an Arabic app, a store release or an old system to replace. Tell me what can’t fail
            and I’ll reply in English, Arabic or French.
          </p>
          <div className="mt-10 flex flex-wrap gap-2 text-[15px]">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(EMAIL)}
              className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-text transition-colors hover:bg-white/5"
            >
              {EMAIL}
            </button>
            <a href="https://github.com/furrsati" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full border border-line px-5 text-text-2 hover:text-text">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/danizein" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full border border-line px-5 text-text-2 hover:text-text">
              LinkedIn
            </a>
          </div>
          <p className="mt-8 max-w-[44ch] text-[14px] leading-relaxed text-text-3">
            No testimonials here. Ask, and I’ll introduce you to the people I built for.
          </p>
        </div>

        <div className="rounded-[32px] border border-line bg-[#0a0b0d]/80 p-6 backdrop-blur-sm md:p-8">
          <AnimatePresence mode="wait">
            {state === "sent" ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[420px] flex-col justify-center" aria-live="polite">
                <div className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.02em]">Sent.</div>
                <p className="mt-3 text-[17px] text-text-2">I’ll reply to {email} within a working day.</p>
                <button type="button" onClick={() => setState("idle")} className="mt-8 self-start text-[15px] text-text-2 underline underline-offset-4 hover:text-text">
                  Send another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5" noValidate>
                <div role="radiogroup" aria-label="What is this about" className="grid grid-cols-2 rounded-full border border-line p-1 text-[14px]">
                  {(
                    [
                      ["build", "Build something"],
                      ["hire", "I’m hiring"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={mode === id}
                      onClick={() => setMode(id)}
                      className="relative h-10 rounded-full px-3"
                    >
                      {mode === id && <motion.span layoutId="mode" className="absolute inset-0 rounded-full bg-text" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                      <span className={`relative ${mode === id ? "text-black" : "text-text-2"}`}>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field name="name" label="Your name" placeholder="Name" />
                  <Field name="email" label="Email" placeholder="you@company.com" type="email" />
                </div>
                <Field
                  name="message"
                  label={mode === "build" ? "What has to work?" : "The role"}
                  placeholder={mode === "build" ? "The one thing that can’t fail: payouts, live chat, Arabic, a store release…" : "Role, team, remote or on-site, and a link if you have one."}
                  textarea
                />
                {mode === "build" && (
                  <fieldset>
                    <legend className="mb-2 text-[14px] text-text-2">Budget</legend>
                    <div className="flex flex-wrap gap-2">
                      {budgets.map((b) => (
                        <button
                          key={b}
                          type="button"
                          aria-pressed={budget === b}
                          onClick={() => setBudget(b)}
                          className={`h-10 rounded-full border px-4 text-[14px] transition-colors ${budget === b ? "border-text bg-text text-black" : "border-line text-text-2 hover:text-text"}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <div aria-live="polite" className="min-h-[1.25rem] text-[14px] text-[#ff8a7a]">
                  {error || (state === "error" ? `That didn’t send, but your text is still here. Try again, or email ${EMAIL}.` : "")}
                </div>
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="h-14 rounded-full bg-text text-[16px] font-medium text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {state === "sending" ? "Sending…" : "Send brief"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Field({ name, label, placeholder, type = "text", textarea }: { name: string; label: string; placeholder: string; type?: string; textarea?: boolean }) {
  const cls =
    "w-full rounded-2xl border border-line bg-white/[0.03] px-4 text-[16px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-line-strong focus:bg-white/[0.05]";
  return (
    <label className="flex flex-col gap-2 text-[14px] text-text-2">
      {label}
      {textarea ? (
        <textarea name={name} placeholder={placeholder} rows={4} className={`${cls} resize-none py-3`} />
      ) : (
        <input name={name} type={type} placeholder={placeholder} className={`${cls} h-12`} />
      )}
    </label>
  );
}

import { projects, type Project } from "@/lib/content/projects";

export type StepKey = "scope" | "build" | "ship" | "handover";

/** The four steps, in order. Accents run warm to cool, one journey across the rail. */
export const steps: { key: StepKey; name: string; body: string; accent: string }[] = [
  {
    key: "scope",
    name: "Scope",
    body: "We agree what has to work, what can wait and what done means. You get a written scope and a dated first milestone.",
    accent: "#FAA21B",
  },
  {
    key: "build",
    name: "Build",
    body: "I work on a staging link you can open any time. You see working software every week, not slides.",
    accent: "#DCB877",
  },
  {
    key: "ship",
    name: "Ship",
    body: "Store review, DNS cutover or launch day. I run it, and the old version stays ready as the rollback.",
    accent: "#A08CFF",
  },
  {
    key: "handover",
    name: "Hand over",
    body: "The admin, the docs and the access are yours. Your team runs it day to day without calling me.",
    accent: "#6F7BFF",
  },
];

/** Pinned-range progress where each step starts; the last one runs to 1. */
export const stepStarts = [0, 0.25, 0.5, 0.75] as const;
export const stepAt = (v: number) => (v < stepStarts[1] ? 0 : v < stepStarts[2] ? 1 : v < stepStarts[3] ? 2 : 3);

export const engagements: { name: string; body: string; seen: string[]; accent: string }[] = [
  {
    name: "MVP to the stores",
    body: "A first version live on the App Store and Google Play, with the admin you need on day one.",
    seen: ["furrsati", "collabfront", "newsgate"],
    accent: "#FAA21B",
  },
  {
    name: "Platform build",
    body: "Web platform, backend, admin and payments built as one system.",
    seen: ["proof-of-talk", "yalla-trivia", "altamira"],
    accent: "#DCB877",
  },
  {
    name: "Legacy rescue and cutover",
    body: "Rebuilt next to the old site, every URL kept, switched with one DNS change.",
    seen: ["proof-of-talk", "altamira"],
    accent: "#E5813F",
  },
  {
    name: "Arabic and RTL",
    body: "Layout, numbers, plurals, dates and dialect done properly, not just translated strings.",
    seen: ["newsgate", "yalla-trivia", "collabfront"],
    accent: "#7B7BFF",
  },
  {
    name: "AI that holds up in production",
    body: "Timeouts, fallbacks, cost logs and a person approving what matters.",
    seen: ["furrsati", "yalla-trivia", "hq"],
    accent: "#D4714E",
  },
];

export const bySlug: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.slug, p]));

export const EASE = [0.16, 1, 0.3, 1] as const;

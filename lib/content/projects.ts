export type Status = "Live" | "Pre-launch" | "Staging" | "Store-ready" | "Internal";
export type Device = "phone" | "laptop" | "tv" | "window";
export type Platform = "ios" | "android" | "web" | "mac" | "tv";

/** Icon keys rendered by components/sections/chapter/icons.tsx */
export type HighlightIcon =
  | "lock"
  | "zap"
  | "bot"
  | "shield"
  | "workflow"
  | "clock"
  | "languages"
  | "wifi-off"
  | "film"
  | "switch"
  | "qr"
  | "screens"
  | "sparkles"
  | "rocket"
  | "calendar"
  | "car"
  | "scan"
  | "brain";

/** Logo keys rendered from simple-icons in components/sections/chapter/logos.tsx */
export type Tech =
  | "React Native"
  | "Expo"
  | "React"
  | "Next.js"
  | "TypeScript"
  | "Node.js"
  | "Express"
  | "Fastify"
  | "Postgres"
  | "Prisma"
  | "Drizzle"
  | "Supabase"
  | "Neon"
  | "SQLite"
  | "Redis"
  | "Stripe"
  | "Socket.io"
  | "Firebase"
  | "Claude"
  | "Electron"
  | "TanStack Query"
  | "Zod"
  | "GSAP"
  | "Resend"
  | "Tailwind CSS"
  | "Vercel"
  | "Puppeteer";

export type Project = {
  slug: string;
  name: string;
  nameAr?: string;
  credit: "Own product" | "Client work";
  status: Status;
  platforms: Platform[];
  headline: string;
  /** Told in three beats that advance as the chapter scrolls. */
  story: { challenge: string; built: string; result: string };
  highlights: { icon: HighlightIcon; title: string; body: string }[];
  /** What Dani did on it. */
  roles: string[];
  stack: Tech[];
  /** Brand light: [primary, secondary] */
  glow: [string, string];
  device: Device;
  /** Screens cycled on the device, paths under /public */
  screens: string[];
  /** A screen recording played on the device, scrubbed by scroll (replaces the screens). */
  film?: { src: string; poster: string };
  links: { kind: "web" | "appstore" | "play"; label: string; href: string }[];
};

export const projects: Project[] = [
  {
    slug: "furrsati",
    name: "Furrsati",
    nameAr: "فرصتي",
    credit: "Own product",
    status: "Live",
    platforms: ["ios", "android", "web"],
    headline: "A freelance marketplace where money moves only when the work is approved.",
    story: {
      challenge:
        "Freelancers across Lebanon and MENA wait weeks to get paid, and clients pay upfront for work that may never arrive. Nobody trusts the other side with the money.",
      built:
        "A marketplace on iOS, Android and the web. Every milestone is funded into escrow, released when the client approves, and paid out through OMT, Whish or crypto. Chat with voice notes, KYC with the camera, and paid video consultations.",
      result:
        "Live on the App Store and Google Play, in English, French and Arabic, with a 73-page admin that runs disputes, KYC and payouts.",
    },
    highlights: [
      { icon: "lock", title: "Escrow to the cent", body: "A payment can only split one way: amount = fee + payout." },
      { icon: "zap", title: "Truthful realtime", body: "Chat and payment events go out only after the database commits." },
      { icon: "bot", title: "AI with a safety net", body: "Claude features with a circuit breaker, retries and a cost log on every call." },
    ],
    roles: ["Product", "iOS & Android", "Backend", "Payments", "Admin", "AI"],
    stack: ["React Native", "Node.js", "Postgres", "Prisma", "Stripe", "Socket.io", "Redis", "Claude"],
    glow: ["#FAA21B", "#05696B"],
    device: "phone",
    screens: ["/work/furrsati-1.jpg", "/work/furrsati-2.jpg", "/work/furrsati-3.jpg"],
    links: [
      { kind: "web", label: "furrsati.com", href: "https://furrsati.com" },
      { kind: "appstore", label: "App Store", href: "https://apps.apple.com/us/app/furrsati-freelance-hire/id6759173862" },
      { kind: "play", label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.furrsatiltd.freelance" },
    ],
  },
  {
    slug: "collabfront",
    name: "Collabfront",
    credit: "Client work",
    status: "Live",
    platforms: ["ios", "android", "web"],
    headline: "Brands and creators find each other, agree terms and get paid safely.",
    story: {
      challenge: "Brands need creators they can trust, and creators need to know they'll be paid, whether the deal is cash or product.",
      built:
        "A marketplace for paid campaigns, barter deals and direct bookings, with the payment held in escrow, Stripe subscriptions for brands, and live messaging, all in English, French and Arabic.",
      result: "Live on the App Store and the web, with Arabic running fully right to left, and updates shipped over the air.",
    },
    highlights: [
      { icon: "lock", title: "Escrow on bookings", body: "Money is held until the content is delivered and approved." },
      { icon: "languages", title: "Arabic, properly", body: "The whole interface mirrors right to left, not just the words." },
      { icon: "rocket", title: "Safe over-the-air updates", body: "Every update passes a preflight gate before it reaches phones." },
    ],
    roles: ["iOS & Android", "Backend", "Payments", "Admin", "Web", "RTL"],
    stack: ["Expo", "React Native", "Express", "Prisma", "Supabase", "Stripe", "Socket.io"],
    glow: ["#5656FF", "#C0FF2E"],
    device: "phone",
    screens: ["/work/collabfront-1.jpg", "/work/collabfront-2.jpg", "/work/collabfront-3.jpg"],
    links: [
      { kind: "web", label: "collabfront.me", href: "https://collabfront.me" },
      { kind: "appstore", label: "App Store", href: "https://apps.apple.com/us/app/collabfront/id6760047475" },
    ],
  },
  {
    slug: "proof-of-talk",
    name: "Proof of Talk",
    credit: "Client work",
    status: "Live",
    platforms: ["web"],
    headline: "An invitation-only summit at the Louvre, moved off WordPress with one DNS change and zero lost URLs.",
    story: {
      challenge:
        "An executive summit held inside the Louvre in Paris and Abu Dhabi ran on an ageing WordPress site with about 50 plugins, and every new edition needed a developer.",
      built:
        "A custom Next.js and Supabase platform: a cinematic scroll-driven site, application funnels, pitch-deck uploads, attendee cards, and an admin with a sponsor CRM the team edits as plain sentences.",
      result:
        "Switched over with one DNS change while WordPress stayed up as the rollback. Every old URL still works, and a new edition is now a content task.",
    },
    highlights: [
      { icon: "switch", title: "Zero-downtime cutover", body: "Built in parallel, 42 redirects, one DNS switch, nothing lost." },
      { icon: "film", title: "A scroll-scrubbed film", body: "500 frames, smoothed with AI frame interpolation, played by your scroll." },
      { icon: "sparkles", title: "CRM that runs itself", body: "Sponsor automations the team writes as sentences, run hourly and never twice." },
    ],
    roles: ["Frontend", "Backend", "Admin & CRM", "Migration", "SEO", "Motion"],
    stack: ["Next.js", "Supabase", "Postgres", "GSAP", "Resend", "Vercel"],
    glow: ["#DCB877", "#D35400"],
    device: "laptop",
    screens: ["/work/pot-film-poster.jpg"],
    film: { src: "/work/pot-film.mp4", poster: "/work/pot-film-poster.jpg" },
    links: [{ kind: "web", label: "proofoftalk.io", href: "https://proofoftalk.io" }],
  },
  {
    slug: "yalla-trivia",
    name: "Yalla Trivia",
    nameAr: "يلا تريفيا",
    credit: "Client work",
    status: "Pre-launch",
    platforms: ["web", "tv"],
    headline: "A Lebanese game show for the couch, with a question bank that checks its own facts.",
    story: {
      challenge:
        "Lebanese players had no trivia game that sounded like home. Generic apps use formal Arabic, and static question packs run out.",
      built:
        "A two-team game show on one shared screen, with a 36-card board and charades handed off to a phone by QR. Behind it, an AI engine drafts, de-duplicates and fact-checks questions in Arabic, English and French.",
      result: "7,516 approved questions across 97 sub-themes, each one approved by a person before it can be played. Launching soon.",
    },
    highlights: [
      { icon: "brain", title: "An AI that checks itself", body: "Duplicates caught by meaning, facts checked by two model families." },
      { icon: "qr", title: "TV to phone, live", body: "The actor scans a code and reads the word privately on their own phone." },
      { icon: "screens", title: "One board, every screen", body: "36 cards with no scrolling, from a small phone to a 1080p TV." },
    ],
    roles: ["Product", "Game design", "Frontend", "Backend", "AI pipeline", "Payments"],
    stack: ["Next.js", "Supabase", "Postgres", "Drizzle", "Claude", "Tailwind CSS"],
    glow: ["#B61F24", "#326DB1"],
    device: "tv",
    screens: ["/work/yalla-1.jpg", "/work/yalla-2.jpg", "/work/yalla-3.jpg"],
    links: [{ kind: "web", label: "yallatrivia.app", href: "https://www.yallatrivia.app" }],
  },
  {
    slug: "altamira",
    name: "Altamira Village",
    credit: "Client work",
    status: "Staging",
    platforms: ["web"],
    headline: "A hotel in Caracas that takes bookings over slow payment rails, and can finally see its own car park.",
    story: {
      challenge:
        "A hotel, spa, casino and shopping complex in Caracas needed bookings that work with slow, manual payments, and its parking system had no reporting at all.",
      built:
        "A Spanish and English site, a booking engine with an audited state machine, a staff admin, and parking analytics built on data recovered from the vendor's own system.",
      result: "Running on staging and checked against the designer's files, down to 652 individual text spans.",
    },
    highlights: [
      { icon: "calendar", title: "Bookings over slow rails", body: "Pago Móvil and Zelle payments wait in review, with every step audited." },
      { icon: "car", title: "A car park it can see", body: "Occupancy and revenue rebuilt from a system that shipped with no reports." },
      { icon: "scan", title: "Look-alike plate search", body: "Staff find the car even when the camera reads 8 as B." },
    ],
    roles: ["Full-stack", "Booking engine", "Staff admin", "Data", "Design fidelity"],
    stack: ["Next.js", "Postgres", "Drizzle", "Neon", "Puppeteer", "Vercel"],
    glow: ["#C88A3D", "#2E6B55"],
    device: "laptop",
    screens: ["/work/altamira-hero.jpg", "/work/altamira-room.jpg"],
    links: [],
  },
  {
    slug: "newsgate",
    name: "NewsGate",
    nameAr: "نيوز غيت",
    credit: "Client work",
    status: "Store-ready",
    platforms: ["ios", "android"],
    headline: "An Arabic news app that stays fast on bad networks and a worse API.",
    story: {
      challenge:
        "A Lebanese news outlet had a website and an API it doesn't control: broken rows, dates without time zones and pagination that drifts.",
      built:
        "A native Arabic reader, right to left throughout, with a breaking-news ticker, sections, video and the live stream, offline bookmarks and breaking-news alerts. Every API row is checked on its own.",
      result: "Store-ready: a 17.6 MB Android release, down from 45 MB, and about 308 tests, some run against the live API.",
    },
    highlights: [
      { icon: "shield", title: "Bad data can't blank a screen", body: "A broken story is dropped on its own; the feed stays whole." },
      { icon: "languages", title: "Arabic done right", body: "Beirut time, Levantine month names and hand-written plural rules." },
      { icon: "wifi-off", title: "Works offline", body: "Saved stories and the feed stay readable with no connection." },
    ],
    roles: ["iOS & Android", "Arabic & RTL", "API integration", "Release"],
    stack: ["Expo", "React Native", "TanStack Query", "Zod", "Firebase", "TypeScript"],
    glow: ["#FFBF3F", "#E11D48"],
    device: "phone",
    screens: ["/work/newsgate-1.jpg", "/work/newsgate-2.jpg", "/work/newsgate-3.jpg"],
    links: [{ kind: "web", label: "newsgate.tv", href: "https://www.newsgate.tv" }],
  },
  {
    slug: "hq",
    name: "HQ",
    credit: "Own product",
    status: "Internal",
    platforms: ["web", "mac"],
    headline: "My control room for AI coding agents. They work on schedules; a supervisor decides when to wake me.",
    story: {
      challenge:
        "Running several AI coding agents by hand means babysitting terminals, answering the same questions twice and losing work when a process dies.",
      built:
        "A self-hosted control room. Claude and Codex agents take tasks from a crash-safe queue, run on schedules and share memory. A supervisor agent answers what it can and escalates the rest.",
      result: "Only the decisions that need a person reach me. It runs seven agents across five projects, from a browser or a native Mac app.",
    },
    highlights: [
      { icon: "workflow", title: "Supervisor routing", body: "Workers ask the supervisor first; after 10 minutes it escalates to me." },
      { icon: "clock", title: "Queue and schedules", body: "Tasks survive restarts, and a built-in cron runs the overnight shift." },
      { icon: "shield", title: "Guardrails that fail closed", body: "Risky commands are blocked, and anything unreadable is refused." },
    ],
    roles: ["Architecture", "AI agents", "Backend", "Realtime", "Mac app", "Security"],
    stack: ["TypeScript", "Fastify", "SQLite", "React", "Electron", "Claude"],
    glow: ["#D4714E", "#D9A441"],
    device: "window",
    screens: ["/work/hq-1.jpg", "/work/hq-2.jpg", "/work/hq-3.jpg"],
    links: [],
  },
];

export const statusCopy: Record<Status, string> = {
  Live: "In public hands today",
  "Pre-launch": "Built, not yet public",
  Staging: "Running on a staging address",
  "Store-ready": "Release built, not yet published",
  Internal: "In daily use behind a login",
};

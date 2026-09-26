import {
  siAndroid,
  siApple,
  siClaude,
  siDrizzle,
  siElectron,
  siExpo,
  siExpress,
  siFastify,
  siFirebase,
  siGoogleplay,
  siGreensock,
  siNeon,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPrisma,
  siPuppeteer,
  siReact,
  siReactquery,
  siRedis,
  siResend,
  siSocketdotio,
  siSqlite,
  siStripe,
  siSupabase,
  siTailwindcss,
  siTypescript,
  siVercel,
  siZod,
  type SimpleIcon,
} from "simple-icons";
import type { Tech } from "@/lib/content/projects";

const logos: Record<Tech, SimpleIcon> = {
  "React Native": siReact,
  Expo: siExpo,
  React: siReact,
  "Next.js": siNextdotjs,
  TypeScript: siTypescript,
  "Node.js": siNodedotjs,
  Express: siExpress,
  Fastify: siFastify,
  Postgres: siPostgresql,
  Prisma: siPrisma,
  Drizzle: siDrizzle,
  Supabase: siSupabase,
  Neon: siNeon,
  SQLite: siSqlite,
  Redis: siRedis,
  Stripe: siStripe,
  "Socket.io": siSocketdotio,
  Firebase: siFirebase,
  Claude: siClaude,
  Electron: siElectron,
  "TanStack Query": siReactquery,
  Zod: siZod,
  GSAP: siGreensock,
  Resend: siResend,
  "Tailwind CSS": siTailwindcss,
  Vercel: siVercel,
  Puppeteer: siPuppeteer,
};

/** Brand hex, lifted to stay visible on black (dark brand colors become white). */
function onBlack(hex: string) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.28 ? "#f4f4f2" : `#${hex}`;
}

function Svg({ icon, className }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

export function TechLogo({ name }: { name: Tech }) {
  const icon = logos[name];
  return (
    <span
      className="group/logo inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line pl-2.5 pr-3 text-[12.5px] text-text-2 transition-colors duration-300 hover:border-line-strong hover:text-text"
      style={{ ["--brand" as string]: onBlack(icon.hex) }}
    >
      <Svg icon={icon} className="h-3.5 w-3.5 transition-colors duration-300 group-hover/logo:text-[var(--brand)]" />
      {name}
    </span>
  );
}

export function AppleMark({ className }: { className?: string }) {
  return <Svg icon={siApple} className={className} />;
}
export function AndroidMark({ className }: { className?: string }) {
  return <Svg icon={siAndroid} className={className} />;
}
export function PlayMark({ className }: { className?: string }) {
  return <Svg icon={siGoogleplay} className={className} />;
}

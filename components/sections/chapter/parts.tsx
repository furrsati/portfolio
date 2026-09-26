import { ArrowUpRight, Globe, Laptop, Tv } from "lucide-react";
import type { Platform, Project } from "@/lib/content/projects";
import { statusCopy } from "@/lib/content/projects";
import { AndroidMark, AppleMark, PlayMark, TechLogo } from "./logos";

export const platformLabel: Record<Platform, string> = { ios: "iOS", android: "Android", web: "Web", mac: "Mac", tv: "TV" };

function PlatformGlyph({ p }: { p: Platform }) {
  const c = "h-3.5 w-3.5";
  if (p === "ios") return <AppleMark className={c} />;
  if (p === "android") return <AndroidMark className={c} />;
  if (p === "mac") return <Laptop className={c} strokeWidth={1.8} />;
  if (p === "tv") return <Tv className={c} strokeWidth={1.8} />;
  return <Globe className={c} strokeWidth={1.8} />;
}

/** Chapter number, status, credit and the platforms it ships on. */
export function MetaRow({ project, n, total }: { project: Project; n: number; total: number }) {
  const a = project.glow[0];
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] text-text-2">
      <span className="mr-1 tabular-nums text-text-3">
        <span className="text-text">{String(n).padStart(2, "0")}</span> / {String(total).padStart(2, "0")}
      </span>
      <span className="inline-flex h-7 items-center gap-2 rounded-full border border-line px-3" title={statusCopy[project.status]}>
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          {project.status === "Live" && (
            <span className="absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden" style={{ background: a, animationDuration: "2.4s" }} />
          )}
          <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: a, boxShadow: `0 0 10px ${a}` }} />
        </span>
        {project.status}
      </span>
      <span className="inline-flex h-7 items-center rounded-full border border-line px-3">{project.credit}</span>
      <span
        className="inline-flex h-7 items-center gap-2.5 pl-1.5 text-text-2"
        aria-label={`Platforms: ${project.platforms.map((p) => platformLabel[p]).join(", ")}`}
      >
        {project.platforms.map((p) => (
          <span key={p} title={platformLabel[p]} className="inline-flex">
            <PlatformGlyph p={p} />
          </span>
        ))}
      </span>
    </div>
  );
}

export function Links({ project, color }: { project: Project; color: string }) {
  if (!project.links.length)
    return (
      <p className="text-[14px] text-text-3">{project.status === "Internal" ? "Private tool. Walkthrough on request." : "Staging link on request."}</p>
    );
  return (
    <div className="flex flex-wrap gap-2">
      {project.links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          style={{ ["--brand" as string]: color }}
          className="group/link inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white/[0.02] px-4 text-[14px] text-text transition-[background-color,border-color,color] duration-300 hover:border-transparent hover:bg-[var(--brand)] hover:text-black focus-visible:bg-[var(--brand)] focus-visible:text-black"
        >
          {l.kind === "appstore" && <AppleMark className="h-4 w-4" />}
          {l.kind === "play" && <PlayMark className="h-3.5 w-3.5" />}
          {l.label}
          {l.kind === "web" && (
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          )}
        </a>
      ))}
    </div>
  );
}

/** "What I did" chips and the tech it was built with. */
export function Craft({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] text-text-3">What I did</span>
        {project.roles.map((r) => (
          <span key={r} className="inline-flex h-[26px] items-center rounded-full bg-white/[0.06] px-2.5 text-[12.5px] text-text">
            {r}
          </span>
        ))}
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Built with">
        {project.stack.map((t) => (
          <li key={t}>
            <TechLogo name={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

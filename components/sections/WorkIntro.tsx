import ProjectLogo from "@/components/ui/ProjectLogo";
import { projects } from "@/lib/content/projects";

export default function WorkIntro() {
  const own = projects.filter((p) => p.credit === "Own product").length;
  return (
    <div id="work" className="relative px-5 pb-10 pt-32 md:px-10 lg:px-16 lg:pt-44">
      <div className="mx-auto max-w-[1500px]">
        <h2 className="max-w-[18ch] text-[clamp(2.75rem,11.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96] [text-wrap:balance] sm:text-[clamp(2.75rem,6.5vw,6rem)]">
          {/* Non-breaking spaces keep "2 are" and "5 I built" whole, so no line ends on a stray "5 I". */}
          Seven products. {own}{"\u00a0"}are mine, {projects.length - own}{"\u00a0"}I{"\u00a0"}built for clients.
        </h2>
        <ul className="mt-8 flex flex-wrap gap-2 md:mt-10">
          {projects.map((p) => (
            <li key={p.slug}>
              <a
                href={`#${p.slug}`}
                className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line py-1 pl-1.5 pr-4 text-[14px] text-text-2 transition-colors [-webkit-tap-highlight-color:transparent] hover:border-line-strong hover:text-text active:border-line-strong active:bg-white/[0.06] active:text-text"
              >
                <ProjectLogo slug={p.slug} name={p.name} size={28} />
                {p.name}
                <span className="text-text-2/75">{p.status}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

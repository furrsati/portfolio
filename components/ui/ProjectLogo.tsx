/** A project's real app icon from /public/logos, as a rounded app tile. */
export default function ProjectLogo({ slug, name, size = 24, className = "" }: { slug: string; name: string; size?: number; className?: string }) {
  return (
    // Tiny static PNGs (192px): a plain <img> avoids next/image's layout warnings for fixed-size icons.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/logos/${slug}.png`}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`block shrink-0 rounded-[22%] ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size, maxWidth: "none" }}
    />
  );
}

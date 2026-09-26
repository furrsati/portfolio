import { ImageResponse } from "next/og";
import { projects } from "@/lib/content/projects";

export const alt = "Dani Zein builds products end to end";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#000",
          backgroundImage:
            "radial-gradient(circle at 78% 40%, rgba(250,162,27,.30), rgba(0,0,0,0) 45%), radial-gradient(circle at 95% 95%, rgba(86,86,255,.28), rgba(0,0,0,0) 35%)",
          color: "#f4f4f2",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>Dani Zein</div>
          <div style={{ marginTop: 28, fontSize: 38, color: "#a3a6ad", maxWidth: 860, lineHeight: 1.3 }}>
            I build products end to end: marketplaces, AI systems and Arabic-first apps.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {projects.map((p) => (
            <div
              key={p.slug}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", fontSize: 24 }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 12, background: p.glow[0] }} />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

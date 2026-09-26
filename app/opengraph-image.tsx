import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { projects } from "@/lib/content/projects";

export const alt = "Dani Zein builds products end to end: seven real products, from the database to the App Store.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const root = process.cwd();
const file = (p: string) => readFile(path.join(root, p));
const dataUri = async (p: string, mime: string) => `data:${mime};base64,${(await file(p)).toString("base64")}`;

/** A phone drawn in the card: titanium rim, black glass, the real screen inside. */
function PhoneFrame({ src, w, rotate, x, y, z }: { src: string; w: number; rotate: number; x: number; y: number; z: number }) {
  const h = Math.round(w * 2.075);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        display: "flex",
        padding: 6,
        borderRadius: w * 0.17,
        background: "linear-gradient(135deg, #6b6b70, #1c1c1f 40%, #3a3a3f 75%, #111)",
        boxShadow: "0 40px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.08)",
        transform: `rotate(${rotate}deg)`,
        zIndex: z,
      }}
    >
      <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: w * 0.14, overflow: "hidden", background: "#000" }}>
        <img src={src} width={w - 12} height={h - 12} style={{ objectFit: "cover", objectPosition: "top" }} alt="" />
      </div>
    </div>
  );
}

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([file("app/og/bricolage-800.woff"), file("app/og/bricolage-500.woff")]);
  const [pot, furrsati, collab, ...logos] = await Promise.all([
    dataUri("public/work/pot-film-poster.jpg", "image/jpeg"),
    dataUri("public/work/furrsati-2.jpg", "image/jpeg"),
    dataUri("public/work/collabfront-1.jpg", "image/jpeg"),
    ...projects.map((p) => dataUri(`public/logos/${p.slug}.png`, "image/png")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#000",
          backgroundImage:
            "radial-gradient(circle at 76% 42%, rgba(250,162,27,.34), rgba(0,0,0,0) 38%), radial-gradient(circle at 100% 100%, rgba(86,86,255,.36), rgba(0,0,0,0) 36%), radial-gradient(circle at 58% 0%, rgba(220,184,119,.16), rgba(0,0,0,0) 30%)",
          fontFamily: "Bricolage",
          color: "#f4f4f2",
        }}
      >
        {/* Copy */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: 600, zIndex: 5 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -5.5, lineHeight: 0.92 }}>Dani Zein</div>
            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", fontSize: 32, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.7, color: "#f4f4f2" }}>
              <span>I build products end to end,</span>
              <span>from the database to the App Store.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex" }}>
                {logos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    width={46}
                    height={46}
                    alt=""
                    style={{ borderRadius: 11, marginLeft: i === 0 ? 0 : -9, border: "2px solid #000" }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", fontSize: 20, fontWeight: 500, lineHeight: 1.3 }}>
                <span>7 products shipped</span>
                <span style={{ color: "#8b8e96" }}>Lebanon, working worldwide</span>
              </div>
            </div>
          </div>
        </div>

        {/* The product line-up */}
        <div style={{ position: "absolute", left: 600, top: 0, width: 600, height: 630, display: "flex" }}>
          {/* Pedestal glow */}
          <div
            style={{
              position: "absolute",
              left: 34,
              top: 452,
              width: 540,
              height: 96,
              borderRadius: "50%",
              border: "2px solid rgba(250,170,60,.9)",
              boxShadow: "0 0 46px rgba(250,162,27,.55), 0 10px 60px rgba(250,162,27,.25), inset 0 0 26px rgba(250,162,27,.35)",
              backgroundImage: "radial-gradient(circle at 50% 40%, #4a4a50, #1b1b1e 70%)",
            }}
          />
          {/* Laptop */}
          <div style={{ position: "absolute", left: 88, top: 150, width: 444, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
            <div
              style={{
                display: "flex",
                width: 444,
                height: 285,
                padding: 9,
                borderRadius: 16,
                background: "linear-gradient(180deg, #2c2c30, #111113)",
                boxShadow: "0 30px 70px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.1)",
              }}
            >
              <img src={pot} width={426} height={267} alt="" style={{ objectFit: "cover", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", width: 520, height: 16, borderRadius: "0 0 14px 14px", background: "linear-gradient(180deg, #8a8a90, #3a3a3e)", boxShadow: "0 18px 40px rgba(0,0,0,.6)" }} />
          </div>
          <PhoneFrame src={furrsati} w={150} rotate={-6} x={22} y={200} z={4} />
          <PhoneFrame src={collab} w={132} rotate={7} x={430} y={232} z={3} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bold, weight: 800, style: "normal" },
        { name: "Bricolage", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}

import { NextResponse } from "next/server";

const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max = 4000) => String(v ?? "").slice(0, max).trim();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Honeypot: bots fill hidden fields; pretend success.
  if (clean(body.company_website)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 200);
  const email = clean(body.email, 320);
  const message = clean(body.message);
  const mode = body.mode === "hire" ? "Hiring" : "Project";
  const budget = clean(body.budget, 50);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
    return NextResponse.json({ error: "Email and message are required" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many messages" }, { status: 429 });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? "danizein@furrsati.com";
  const from = process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>";
  if (!key) {
    console.error("[contact] RESEND_API_KEY is not set; message not delivered");
    return NextResponse.json({ error: "Email is not configured" }, { status: 503 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `${mode} brief from ${name || email}`,
      text: [`${mode} brief`, `Name: ${name}`, `Email: ${email}`, budget && `Budget: ${budget}`, "", message].filter(Boolean).join("\n"),
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend error", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

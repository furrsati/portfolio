# Dani Zein · portfolio

A dark, cinematic portfolio: seven real products shown as 3D devices lit in each product's brand colour, a bento grid of live mini-demos taken from those products, and a contact form that actually sends.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local` and add a Resend key to make the contact form deliver.

## How it's built

- **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**, **framer-motion**.
- **3D:** one WebGL canvas (`components/three/Stage.tsx`) renders every device through drei `View`s pinned to DOM elements. The devices in `components/three/devices.tsx` are built from geometry with the real screenshots as textures, so there are no model files.
- **Scroll:** Lenis smooth scroll and the WebGL render share a single frame loop (`components/layout/SmoothScroll.tsx`), so devices never lag the page.
- **Content:** every project fact lives in `lib/content/projects.ts`.
- **Live demos:** `components/bento/tiles/*`. Each one is self-contained and uses `components/bento/Tile.tsx`.
- **Accessibility:** reduced motion turns off smooth scroll, autoplay and the entrance animation. Everything is keyboard reachable, and ⌘K opens a command palette.

## Adding or updating a project

1. Put screenshots in `public/work/`. Phone shots should be about 460×1000 and web shots about 1600px wide, as JPEG.
2. Add or update the entry in `lib/content/projects.ts`: status, credit, stats, hard parts, links and brand `glow`.

/**
 * The site's public origin, for absolute URLs in social cards, the sitemap and
 * robots.txt. Order: an explicit NEXT_PUBLIC_SITE_URL (set this to the custom
 * domain), then Vercel's production domain, then this deployment's own URL,
 * then localhost for development.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

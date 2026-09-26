import type { MetadataRoute } from "next";
import { siteUrl as site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}

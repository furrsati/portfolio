import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Tajawal } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Dani Zein · I build products end to end",
  description:
    "Full-stack developer in Lebanon, working worldwide. Marketplaces, AI systems and Arabic-first apps: seven real products, with live demos of how they work.",
  openGraph: {
    title: "Dani Zein · I build products end to end",
    description:
      "Marketplaces, AI systems and Arabic-first apps. Seven real products, with live demos of how they work.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Dani Zein · I build products end to end" },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-black">
      <body className={`${bricolage.variable} ${tajawal.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dani Zein | Mobile & Web Full-Stack Developer",
  description:
    "Portfolio of Dani Zein — Full-Stack Developer specializing in React Native, Next.js, and Node.js. Building production-ready mobile and web applications.",
  keywords: [
    "Dani Zein",
    "Full-Stack Developer",
    "React Native",
    "Next.js",
    "Node.js",
    "Mobile Developer",
    "Web Developer",
    "Portfolio",
  ],
  openGraph: {
    title: "Dani Zein | Mobile & Web Full-Stack Developer",
    description:
      "Full-Stack Developer specializing in React Native, Next.js, and Node.js.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dani Zein | Mobile & Web Full-Stack Developer",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// One serif family for both body and headings — Cormorant Garamond's low
// x-height read as too thin for body copy, so headings and prose now share
// Fraunces instead. It's a variable font with an optical-size axis, so the
// browser renders a sturdier, more legible cut at body text sizes and a
// more expressive display cut at heading sizes automatically, rather than
// stretching one static design across both roles.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LingoCrawlUI — Share a website for your language",
  description:
    "Help Common Crawl's web-languages project by sharing a website in your language — no GitHub account needed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}

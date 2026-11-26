import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmogShield AI — Urban Air Quality & Winter Smog Assistant",
  description:
    "GenAI-powered assistant helping families and communities navigate severe winter smog with low-emission daily routines, indoor air quality hacks, sustainable swaps, and quantified health and emission impacts.",
  keywords: [
    "air quality",
    "winter smog",
    "PM2.5",
    "AQI",
    "Gemini AI",
    "Corsi-Rosenthal",
    "indoor air quality",
    "low-emission routine",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950 focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "System Design Studio",
  description: "An interactive, AI-guided system design handbook and diagram workshop.",
  openGraph: {
    title: "System Design Studio",
    description: "Design from requirements, not patterns.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "System Design Studio architecture map" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Studio",
    description: "Design from requirements, not patterns.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

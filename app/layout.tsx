import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HandbookProgressProvider } from "./components/HandbookProgressProvider";
import { rootMetadata } from "./site-metadata";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = rootMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <HandbookProgressProvider>{children}</HandbookProgressProvider>
      </body>
    </html>
  );
}

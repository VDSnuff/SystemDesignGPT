import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "./components/AppHeader";
import { notFoundMetadata } from "./site-metadata";

export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-paper px-5 py-16 text-ink sm:px-10" id="main-content" tabIndex={-1}>
        <div className="mx-auto max-w-3xl">
          <p className="kicker">404 · Page not found</p>
          <h1 className="page-title mt-5 font-serif text-5xl tracking-[-0.04em]">This page is outside the map.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Return to the handbook or open the Quick Guide to continue designing.</p>
          <Link className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-semibold text-white" href="/">Return to the handbook</Link>
        </div>
      </main>
    </>
  );
}

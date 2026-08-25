import { AppHeader } from "../../components/AppHeader";
import { OwnerComments } from "./OwnerComments";

export default function OwnerCommentsPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-paper text-ink" id="main-content" tabIndex={-1}>
      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-10">
        <p className="kicker">Owner workspace</p>
        <h1 className="page-title mt-3 font-serif text-5xl tracking-[-0.04em]">Learning comments</h1>
        <p className="mb-8 mt-3 max-w-2xl text-muted">Questions, corrections, and suggestions sent from handbook sections.</p>
        <OwnerComments />
      </section>
      </main>
    </>
  );
}

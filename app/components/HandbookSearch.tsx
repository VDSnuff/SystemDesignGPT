"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { BookSearchEntry } from "../book-search.generated";
import type { BookSearchResult } from "../book-search";

const SEARCH_RESULTS_ID = "handbook-search-results";
const hydrationSubscription = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;
let searchModulePromise: Promise<typeof import("../book-search")> | undefined;

type SearchLoadStatus = "idle" | "loading" | "ready" | "error";

function loadSearchModule() {
  searchModulePromise ??= import("../book-search").catch((error) => {
    searchModulePromise = undefined;
    throw error;
  });
  return searchModulePromise;
}

function useLazySearch(query: string, guideEntries: readonly BookSearchEntry[]) {
  const [rankSearch, setRankSearch] = useState<typeof import("../book-search")["rankSiteSearch"] | null>(null);
  const [loadStatus, setLoadStatus] = useState<SearchLoadStatus>("idle");
  const results = useMemo(() => rankSearch?.(query, guideEntries) ?? [], [guideEntries, query, rankSearch]);
  function prepareSearch() {
    if (loadStatus === "loading" || loadStatus === "ready") return;
    setLoadStatus("loading");
    void loadSearchModule()
      .then((module) => {
        setRankSearch(() => module.rankSiteSearch);
        setLoadStatus("ready");
      })
      .catch(() => setLoadStatus("error"));
  }
  return { loadStatus, prepareSearch, results };
}

function resultMessage(loadStatus: SearchLoadStatus) {
  if (loadStatus === "loading") return "Preparing complete handbook search…";
  if (loadStatus === "error") return "Search is unavailable. Use the guide or handbook navigation.";
}

function searchStatus(query: string, loadStatus: SearchLoadStatus, resultCount: number) {
  if (!query.trim() || loadStatus !== "ready") return "Search guide and handbook titles, headings, and text";
  return resultCount ? `${resultCount} search results` : "No guide or handbook matches";
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ query, text }: Readonly<{ query: string; text: string }>) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const expression = new RegExp(`(${terms.map(escaped).join("|")})`, "gi");
  const normalizedTerms = new Set(terms.map((term) => term.toLowerCase()));
  return text.split(expression).map((part, index) => normalizedTerms.has(part.toLowerCase())
    ? <mark className="rounded bg-accent px-0.5 text-ink" key={`${part}-${index}`}>{part}</mark>
    : part);
}

interface SearchBoxProps {
  readonly isHydrated: boolean;
  readonly isOpen: boolean;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly onQueryChange: (value: string) => void;
  readonly onFocus: () => void;
  readonly query: string;
  readonly status: string;
}

function SearchBox({ isHydrated, isOpen, onKeyDown, onQueryChange, onFocus, query, status }: SearchBoxProps) {
  return <>
    <label className="sr-only" htmlFor={`${SEARCH_RESULTS_ID}-input`}>Search the guide and handbook</label>
    <input aria-controls={SEARCH_RESULTS_ID} aria-expanded={isOpen && Boolean(query.trim())} aria-haspopup="listbox"
      autoComplete="off" className="search-control w-full rounded-full border border-ink/20 bg-white/75 px-4 py-2 text-sm"
      disabled={!isHydrated} id={`${SEARCH_RESULTS_ID}-input`} onFocus={onFocus} onInput={(event) => onQueryChange(event.currentTarget.value)}
      onKeyDown={onKeyDown} placeholder={isHydrated ? "Search guide and handbook" : "Loading search…"} role="combobox" type="search" value={query} />
    <span aria-live="polite" className="sr-only">{status}</span>
  </>;
}

function SearchResults({ isOpen, message, onSelect, query, resultListRef, results }: Readonly<{ isOpen: boolean; message?: string; onSelect: () => void; query: string; resultListRef: RefObject<HTMLUListElement | null>; results: readonly BookSearchResult[] }>) {
  if (!isOpen || !query.trim()) return null;
  return <ul className="absolute right-0 z-50 mt-2 max-h-96 w-[min(92vw,32rem)] overflow-y-auto rounded-2xl border border-ink/15 bg-white p-2 shadow-soft" id={SEARCH_RESULTS_ID} ref={resultListRef} role="listbox">
    {message ? <li aria-live="polite" className="px-3 py-4 text-sm text-muted">{message}</li> : results.length ? results.map((result) => (
      <li aria-selected="false" key={result.href} role="option">
        <Link className="block rounded-xl px-3 py-2 hover:bg-paper" href={result.href} onClick={onSelect}>
          <span className="block text-sm font-bold"><HighlightedText query={query} text={result.heading ?? result.sectionTitle} /></span>
          {result.heading ? <span className="mt-0.5 block text-xs text-muted"><HighlightedText query={query} text={result.sectionTitle} /></span> : null}
        </Link>
      </li>
    )) : <li className="px-3 py-4 text-sm text-muted">No matches. Try a shorter term.</li>}
  </ul>;
}

export function HandbookSearch({ guideEntries }: Readonly<{ guideEntries: readonly BookSearchEntry[] }>) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isHydrated = useSyncExternalStore(hydrationSubscription, clientSnapshot, serverSnapshot);
  const resultListRef = useRef<HTMLUListElement>(null);
  const { loadStatus, prepareSearch, results } = useLazySearch(query, guideEntries);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      event.currentTarget.select();
    }
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      resultListRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    }
  }

  const updateQuery = (value: string) => { setQuery(value); setIsOpen(true); prepareSearch(); };
  const openSearch = () => { setIsOpen(true); prepareSearch(); };
  return <div className="relative w-full max-w-md">
    <SearchBox isHydrated={isHydrated} isOpen={isOpen} onFocus={openSearch} onKeyDown={handleKeyDown} onQueryChange={updateQuery} query={query} status={searchStatus(query, loadStatus, results.length)} />
    <SearchResults isOpen={isOpen} message={resultMessage(loadStatus)} onSelect={() => setIsOpen(false)} query={query} resultListRef={resultListRef} results={results} />
  </div>;
}

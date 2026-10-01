"use client";

import Fuse from "fuse.js";
import { ArrowLeft, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { LanguageRecord } from "@/lib/languages";

const MAX_RESULTS = 8;

export function LanguagePicker({
  languages,
  loading = false,
  selected,
  onSelect,
  onClear,
}: {
  languages: LanguageRecord[];
  loading?: boolean;
  selected: LanguageRecord | null;
  onSelect: (language: LanguageRecord) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  // Keeps typing responsive: the ~8k-entry Fuse search re-runs at lower
  // priority than the input's own re-render instead of blocking each
  // keystroke on it.
  const deferredQuery = useDeferredValue(query);

  const fuse = useMemo(
    () =>
      new Fuse(languages, {
        keys: [
          { name: "refName", weight: 0.7 },
          { name: "altNames", weight: 0.3 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [languages],
  );

  const results = useMemo(() => {
    if (deferredQuery.trim().length === 0) return [];
    return fuse.search(deferredQuery, { limit: MAX_RESULTS }).map((r) => r.item);
  }, [fuse, deferredQuery]);

  function selectLanguage(language: LanguageRecord) {
    onSelect(language);
    setQuery("");
  }

  // Pressing Enter commits the typed name even if it hasn't been picked
  // from the dropdown yet — scans the full list (not just the deferred
  // fuzzy results, which may lag a fast typist) for an exact name match,
  // falling back to a single remaining fuzzy result.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    const lower = trimmed.toLowerCase();
    const exact = languages.find(
      (language) =>
        language.refName.toLowerCase() === lower ||
        language.altNames.some((alt) => alt.toLowerCase() === lower),
    );
    if (exact) {
      e.preventDefault();
      selectLanguage(exact);
      return;
    }
    if (results.length === 1) {
      e.preventDefault();
      selectLanguage(results[0]);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-paper-raised text-ink-soft hover:border-navy hover:text-navy"
          aria-label="Choose a different language"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h2 className="font-heading text-xl font-semibold">{selected.refName}</h2>
        <span className="border border-border bg-paper-raised px-2 py-0.5 font-mono tabular-data text-sm text-ink-soft">
          {selected.id}
        </span>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Loading languages..." : "Search your language..."}
          aria-label="Search for your language"
          className="h-12 pl-11 pr-4 text-base"
          autoComplete="off"
          disabled={loading}
        />
      </div>

      {deferredQuery.trim().length > 0 && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full border border-border bg-paper-raised px-4 py-3 text-ink-soft shadow-md">
          No matches — try another spelling, or the name in your own language.
        </p>
      )}

      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden border border-border bg-paper-raised shadow-md">
          {results.map((language) => (
            <li key={language.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => selectLanguage(language)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-paper"
              >
                <span className="font-medium">{language.refName}</span>
                <span className="flex items-center gap-2">
                  {language.altNames.length > 0 && (
                    <span className="text-sm text-ink-soft">{language.altNames[0]}</span>
                  )}
                  <span className="font-mono text-xs text-ink-soft">{language.id}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

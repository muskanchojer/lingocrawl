"use client";

import Fuse from "fuse.js";
import { Globe, X } from "lucide-react";
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

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-paper-raised px-5 py-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 shrink-0 text-accent" aria-hidden />
          <span className="text-xl font-bold">{selected.refName}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink"
          aria-label="Choose a different language"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Globe
          className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-accent"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading languages..." : "Type your language's name..."}
          aria-label="Search for your language"
          className="h-16 rounded-3xl pl-14 pr-5 text-xl"
          autoComplete="off"
          disabled={loading}
        />
      </div>

      {deferredQuery.trim().length > 0 && results.length === 0 && (
        <p className="absolute z-10 mt-2 w-full rounded-2xl border-2 border-border bg-paper-raised px-5 py-4 text-ink-soft shadow-lg">
          No matches — try another spelling, or the name in your own language.
        </p>
      )}

      {results.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border-2 border-border bg-paper-raised shadow-lg">
          {results.map((language) => (
            <li key={language.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(language);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-5 py-3 text-left text-lg hover:bg-paper"
              >
                <span className="font-semibold">{language.refName}</span>
                {language.altNames.length > 0 && (
                  <span className="text-sm text-ink-soft">{language.altNames[0]}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

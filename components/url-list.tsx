"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/lib/validation";

export type UrlListItem = {
  url: string;
  category: Category;
  note: string | null;
};

const INITIAL_COUNT = 10;

/** Shared list shape for both "already on GitHub" (repo_links) and
 * "recently submitted here" (public_submissions) — same heading + rows of
 * url/category/note, parameterized by data source rather than duplicated.
 * Shows the first few rows and a button for the rest, since a language like
 * Swedish has over a thousand known links. */
export function UrlList({
  heading,
  items,
  emptyMessage,
}: {
  heading: string;
  items: UrlListItem[];
  emptyMessage: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_COUNT);
  const hiddenCount = items.length - visible.length;

  return (
    <div className="rounded-2xl border-2 border-border bg-paper-raised p-5">
      <h3 className="mb-3 text-lg font-bold">{heading}</h3>
      {items.length === 0 ? (
        <p className="text-ink-soft">{emptyMessage}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {visible.map((item, index) => {
              const meta = CATEGORY_META[item.category];
              const Icon = meta.icon;
              return (
                <li key={`${item.url}-${index}`} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${meta.bgClass}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="break-words font-semibold text-ink underline decoration-border underline-offset-2 hover:text-accent"
                    >
                      {item.url}
                    </a>
                    {item.note && <p className="text-sm text-ink-soft">{item.note}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-4 rounded-2xl border-2 border-border px-4 py-2 font-bold hover:border-accent"
            >
              Show all {items.length.toLocaleString("en-US")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

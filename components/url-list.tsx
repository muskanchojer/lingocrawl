"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/lib/validation";

export type UrlListItem = {
  url: string;
  category: Category;
  note: string | null;
};

const INITIAL_COUNT = 5;

/** Shared list shape for both "already on GitHub" (repo_links) and
 * "recently submitted here" (public_submissions): a plain vertical list,
 * five items visible, with a text "see more" disclosure for the rest. */
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
    <section>
      <h3 className="mb-2 font-heading text-lg font-semibold">
        {heading}
        {items.length > 0 && (
          <span className="ml-2 text-base font-sans font-normal italic text-ink-soft">
            {items.length.toLocaleString("en-US")}
          </span>
        )}
      </h3>
      {items.length === 0 ? (
        <p className="text-ink-soft">{emptyMessage}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visible.map((item, index) => {
              const meta = CATEGORY_META[item.category];
              return (
                <li key={`${item.url}-${index}`} className="text-lg leading-snug">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className="break-words text-navy underline decoration-border underline-offset-2 hover:decoration-navy"
                  >
                    {item.url}
                  </a>
                  <span className="text-ink-soft">
                    {" "}
                    — {meta.label}
                    {item.note ? `, ${item.note}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          {showAll
            ? items.length > INITIAL_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="mt-2 text-sm font-semibold text-navy underline underline-offset-2"
                >
                  See less
                </button>
              )
            : hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-2 text-sm font-semibold text-navy underline underline-offset-2"
                >
                  See {hiddenCount.toLocaleString("en-US")} more
                </button>
              )}
        </>
      )}
    </section>
  );
}

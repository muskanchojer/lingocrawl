import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/lib/validation";

export type UrlListItem = {
  url: string;
  category: Category;
  note: string | null;
};

/** Shared list shape for both "already on GitHub" (repo_links) and
 * "recently submitted here" (public_submissions) — same heading + rows of
 * url/category/note, parameterized by data source rather than duplicated. */
export function UrlList({
  heading,
  items,
  emptyMessage,
}: {
  heading: string;
  items: UrlListItem[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-paper-raised p-5">
      <h3 className="mb-3 text-lg font-bold">{heading}</h3>
      {items.length === 0 ? (
        <p className="text-ink-soft">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => {
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
      )}
    </div>
  );
}

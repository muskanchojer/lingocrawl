/** Supabase/PostgREST silently caps any single query at 1,000 rows, so
 * loading everything means asking page by page until one comes back short.
 * Used by the sync script (all languages) and the page (a language with
 * more than 1,000 known links, e.g. Swedish). */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

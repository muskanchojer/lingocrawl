export type LanguageType = "living" | "extinct" | "historical" | "constructed" | "special";

export type LanguageRecord = {
  id: string;
  refName: string;
  altNames: string[];
  languageType: LanguageType;
};

let cache: LanguageRecord[] | null = null;
let inflight: Promise<LanguageRecord[]> | null = null;

/** Fetches the full ISO-639-3 dataset (seeded once by
 * scripts/seed-languages.ts into public/languages.json) as a plain static
 * asset — not a module import — so it's a separately cacheable network
 * request that doesn't inflate the client JS bundle or gate hydration on a
 * ~0.5MB JSON parse. Cached in memory after the first successful call;
 * concurrent callers before that share one in-flight request. */
export function loadLanguages(): Promise<LanguageRecord[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/languages.json")
      .then((response) => response.json() as Promise<LanguageRecord[]>)
      .then((data) => {
        cache = data;
        inflight = null;
        return data;
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }
  return inflight;
}

/** Test-only: clears the module-level cache so each test starts fresh. */
export function __resetLanguagesCacheForTests(): void {
  cache = null;
  inflight = null;
}

type NameMatchable = Pick<LanguageRecord, "id" | "refName" | "altNames">;

/** Exact (case-insensitive, trimmed) match against a language's reference
 * name or alternate names. Used by the repo-links sync to resolve a
 * markdown file's language name to an ISO code — deliberately exact rather
 * than fuzzy, since a sync mismatch would silently misfile submissions.
 * Generic over any record with at least id/refName/altNames so the sync
 * script's Supabase-shaped rows (which also carry a cached repo_file_slug)
 * don't need converting to a full LanguageRecord just to match. */
export function matchLanguageByName<T extends NameMatchable>(
  name: string,
  records: T[],
): T | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return records.find(
    (record) =>
      record.refName.toLowerCase() === needle ||
      record.altNames.some((alt) => alt.toLowerCase() === needle),
  );
}

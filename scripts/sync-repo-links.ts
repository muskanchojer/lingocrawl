/**
 * Downloads the commoncrawl/web-languages repo as a single tarball (avoids
 * GitHub's unauthenticated rate limit — ~7,900 individual file fetches
 * would blow through it), parses each language's per-file submission
 * categories, resolves the file to an ISO-639-3 code, and upserts the
 * result into Supabase's `repo_links` table.
 *
 * Without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set, this runs as a dry
 * run against the local public/languages.json: it downloads, parses, and
 * matches, then prints stats instead of writing anything — useful for
 * checking the parser against the live repo without touching the database.
 *
 *   npm run sync-repo-links
 */
import { config } from "dotenv";

// Next.js keeps local secrets in .env.local; load it (then .env) so the
// script sees the same Supabase credentials as the app.
config({ path: [".env.local", ".env"], quiet: true });
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as tar from "tar";
import { createClient } from "@supabase/supabase-js";
import languagesData from "../public/languages.json";
import { matchLanguageByName, type LanguageRecord } from "../lib/languages";
import { parseLanguageMarkdown, type RepoLink } from "../lib/repo-markdown";

const TARBALL_URL =
  "https://github.com/commoncrawl/web-languages/archive/refs/heads/main.tar.gz";
const CATEGORY_FOLDERS = ["living", "extinct", "historical", "constructed", "special"] as const;
const UPSERT_BATCH_SIZE = 500;

type MatchableLanguage = Pick<LanguageRecord, "id" | "refName" | "altNames"> & {
  repoFileSlug: string | null;
};

type RepoLinkRow = {
  language_id: string;
  url: string;
  category: RepoLink["category"];
  note: string | null;
};

/** Postgres's `upsert(..., { onConflict })` aborts the whole batch with
 * "ON CONFLICT DO UPDATE command cannot affect row a second time" if two
 * rows in one call share a conflict key — which happens for real if the
 * source repo lists the same URL under two categories in one file, or two
 * files resolve to the same language. Collapses to one row per
 * (language_id, url), keeping whichever occurrence was parsed first. */
export function dedupeRepoLinkRows(rows: RepoLinkRow[]): RepoLinkRow[] {
  const seen = new Map<string, RepoLinkRow>();
  for (const row of rows) {
    const key = `${row.language_id}\t${row.url}`;
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

/** Supabase/PostgREST silently caps any single query at 1,000 rows, so
 * loading a whole table means asking page by page until one comes back
 * short. Without this the sync only ever saw the first 1,000 languages. */
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

async function downloadTarball(destPath: string) {
  const response = await fetch(TARBALL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download tarball: ${response.status} ${response.statusText}`);
  }
  await writeFile(destPath, Buffer.from(await response.arrayBuffer()));
}

async function findExtractedRepoRoot(workDir: string): Promise<string> {
  const entries = await readdir(workDir, { withFileTypes: true });
  const repoDir = entries.find((e) => e.isDirectory() && e.name.startsWith("web-languages-"));
  if (!repoDir) throw new Error("Could not find extracted repo directory in tarball");
  return path.join(workDir, repoDir.name);
}

async function main() {
  const useSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const supabase = useSupabase
    ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      })
    : null;

  let languages: MatchableLanguage[];
  if (supabase) {
    const rows = await fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("languages")
        .select("id, ref_name, alt_names, repo_file_slug")
        .order("id")
        .range(from, to);
      if (error) throw new Error(`Failed to load languages from Supabase: ${error.message}`);
      return data;
    });
    languages = rows.map((row) => ({
      id: row.id,
      refName: row.ref_name,
      altNames: row.alt_names ?? [],
      repoFileSlug: row.repo_file_slug,
    }));
  } else {
    console.log(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — dry run against local public/languages.json (no repo_file_slug cache, no writes).",
    );
    languages = (languagesData as LanguageRecord[]).map((l) => ({
      id: l.id,
      refName: l.refName,
      altNames: l.altNames,
      repoFileSlug: null,
    }));
  }
  const bySlug = new Map(languages.filter((l) => l.repoFileSlug).map((l) => [l.repoFileSlug!, l]));

  const workDir = await mkdtemp(path.join(tmpdir(), "web-languages-"));
  try {
    const tarballPath = path.join(workDir, "repo.tar.gz");
    console.log("Downloading commoncrawl/web-languages tarball...");
    await downloadTarball(tarballPath);

    console.log("Extracting...");
    await tar.extract({ file: tarballPath, cwd: workDir });
    const repoRoot = await findExtractedRepoRoot(workDir);

    const rows: RepoLinkRow[] = [];
    const newlyMatchedSlugs: { slug: string; languageId: string }[] = [];
    const unmatched: string[] = [];

    for (const folder of CATEGORY_FOLDERS) {
      const folderPath = path.join(repoRoot, folder);
      let files: string[];
      try {
        files = (await readdir(folderPath)).filter(
          (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md",
        );
      } catch {
        continue;
      }

      for (const file of files) {
        const slug = `${folder}/${file}`;
        const content = await readFile(path.join(folderPath, file), "utf-8");
        const parsed = parseLanguageMarkdown(content);
        if (!parsed.displayName) continue;

        let match = bySlug.get(slug);
        if (!match) {
          const candidates = [parsed.displayName, ...parsed.additionalNames];
          for (const name of candidates) {
            match = matchLanguageByName(name, languages);
            if (match) break;
          }
          if (match) newlyMatchedSlugs.push({ slug, languageId: match.id });
        }

        if (!match) {
          unmatched.push(`${slug} (${parsed.displayName})`);
          continue;
        }

        for (const link of parsed.links) {
          rows.push({
            language_id: match.id,
            url: link.url,
            category: link.category,
            note: link.note,
          });
        }
      }
    }

    const dedupedRows = dedupeRepoLinkRows(rows);

    console.log(
      `Parsed ${rows.length} links (${dedupedRows.length} unique) across ${CATEGORY_FOLDERS.length} category folders. ` +
        `${newlyMatchedSlugs.length} files newly matched by name, ${unmatched.length} unmatched.`,
    );
    if (unmatched.length > 0) {
      console.log("Unmatched files (first 20):");
      for (const u of unmatched.slice(0, 20)) console.log(`  - ${u}`);
    }

    if (!supabase) {
      console.log("Dry run complete — no database writes made.");
      return;
    }

    for (let i = 0; i < dedupedRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + UPSERT_BATCH_SIZE).map((r) => ({
        ...r,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("repo_links")
        .upsert(batch, { onConflict: "language_id,url" });
      if (error) throw new Error(`repo_links upsert failed at batch starting ${i}: ${error.message}`);
      console.log(
        `Upserted repo_links ${Math.min(i + UPSERT_BATCH_SIZE, dedupedRows.length)}/${dedupedRows.length}`,
      );
    }

    for (const { slug, languageId } of newlyMatchedSlugs) {
      const { error } = await supabase
        .from("languages")
        .update({ repo_file_slug: slug })
        .eq("id", languageId);
      if (error) throw new Error(`Failed to cache repo_file_slug for ${languageId}: ${error.message}`);
    }

    console.log("Done.");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

/**
 * Downloads SIL's ISO-639-3 reference tables, joins them into flat language
 * records, writes public/languages.json (committed, fetched client-side —
 * see lib/languages.ts — rather than bundled, so it doesn't inflate the JS
 * bundle), and upserts the same records into Supabase's `languages` table.
 *
 * Run once at setup; re-run only if SIL publishes an update.
 *   npm run seed-languages
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildLanguageRecords } from "../lib/sil-transform";

const ISO_6393_TAB_URL =
  "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab";
const NAME_INDEX_TAB_URL =
  "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3_Name_Index.tab";

const OUTPUT_PATH = path.join(__dirname, "..", "public", "languages.json");
const UPSERT_BATCH_SIZE = 500;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function main() {
  console.log("Fetching SIL reference tables...");
  const [iso6393Tab, nameIndexTab] = await Promise.all([
    fetchText(ISO_6393_TAB_URL),
    fetchText(NAME_INDEX_TAB_URL),
  ]);

  const records = buildLanguageRecords(iso6393Tab, nameIndexTab);
  console.log(`Built ${records.length} language records.`);

  await writeFile(OUTPUT_PATH, JSON.stringify(records, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${OUTPUT_PATH}`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping Supabase upsert.",
    );
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const rows = records.map((r) => ({
    id: r.id,
    ref_name: r.refName,
    alt_names: r.altNames,
    language_type: r.languageType,
  }));

  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from("languages").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Upsert failed at batch starting ${i}: ${error.message}`);
    console.log(`Upserted ${Math.min(i + UPSERT_BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

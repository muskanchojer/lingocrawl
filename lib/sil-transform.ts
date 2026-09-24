import type { LanguageRecord, LanguageType } from "./languages";

// SIL's Language_Type uses six codes; the repo's folder taxonomy only has
// five (no separate "ancient" bucket), so Ancient folds into historical
// alongside SIL's own Historical code.
const LANGUAGE_TYPE_MAP: Record<string, LanguageType> = {
  L: "living",
  E: "extinct",
  A: "historical",
  H: "historical",
  C: "constructed",
  S: "special",
};

function parseTab(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .slice(1) // header row
    .map((line) => line.split("\t"));
}

/** Joins SIL's `iso-639-3.tab` (canonical codes + reference names) with
 * `iso-639-3_Name_Index.tab` (alternate names, many-to-one per code) into
 * the flat records the app searches over. */
export function buildLanguageRecords(
  iso6393TabContent: string,
  nameIndexTabContent: string,
): LanguageRecord[] {
  const altNamesById = new Map<string, Set<string>>();
  for (const row of parseTab(nameIndexTabContent)) {
    const [id, printName] = row;
    if (!id || !printName) continue;
    if (!altNamesById.has(id)) altNamesById.set(id, new Set());
    altNamesById.get(id)!.add(printName);
  }

  const records: LanguageRecord[] = [];
  for (const row of parseTab(iso6393TabContent)) {
    const [id, , , , , languageTypeCode, refName] = row;
    if (!id || !refName) continue;

    const altNames = [...(altNamesById.get(id) ?? [])].filter(
      (name) => name.toLowerCase() !== refName.toLowerCase(),
    );

    records.push({
      id,
      refName,
      altNames,
      languageType: LANGUAGE_TYPE_MAP[languageTypeCode] ?? "special",
    });
  }

  return records;
}

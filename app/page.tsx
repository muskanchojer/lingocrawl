"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguagePicker } from "@/components/language-picker";
import { SubmissionForm } from "@/components/submission-form";
import { UrlList, type UrlListItem } from "@/components/url-list";
import { loadLanguages, type LanguageRecord } from "@/lib/languages";
import { supabase } from "@/lib/supabase/client";

// Wording adapted from the web-languages project's own README ("What kind
// of websites are you looking for?"), simplified for first-time visitors.
function WhatToShare() {
  return (
    <div className="rounded-2xl border-2 border-border bg-paper-raised p-5">
      <h2 className="mb-3 text-lg font-bold">What kind of websites help?</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-base">
        <li>
          Websites <strong>written in your language</strong>. A site that is all English is not
          what we need.
        </li>
        <li>
          Sites that are <strong>important and widely used</strong>. If many regions speak your
          language, try to include different regions.
        </li>
        <li>
          If your language is only <strong>one part of a site</strong>, share that exact address,
          for example <span className="whitespace-nowrap">example.com/catalan/</span>.
        </li>
        <li>
          If your language has its own <strong>Wikipedia</strong>, please add it under
          &ldquo;Other&rdquo;.
        </li>
        <li>Not sure? Do your best. You don&apos;t need to fill every category.</li>
      </ul>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    "Search for your language above.",
    "Paste the address of a website written in it.",
    "Pick a category, then press share.",
  ];
  return (
    <div className="rounded-2xl border-2 border-border bg-paper-raised p-5">
      <h2 className="mb-1 text-lg font-bold">How it works</h2>
      <p className="mb-3 text-ink-soft">
        Common Crawl&apos;s web-languages project is building lists of websites in many
        languages, especially ones that are hard to find online. You can help without an
        account or any technical knowledge.
      </p>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-base">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Home() {
  const [languages, setLanguages] = useState<LanguageRecord[]>([]);
  const [selected, setSelected] = useState<LanguageRecord | null>(null);
  const [repoLinks, setRepoLinks] = useState<UrlListItem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<UrlListItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [thanks, setThanks] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    loadLanguages().then(setLanguages);
  }, []);

  async function loadLists(languageId: string) {
    setLoadingLists(true);
    const [repoResult, submissionsResult] = await Promise.all([
      supabase
        .from("repo_links")
        .select("url, category, note")
        .eq("language_id", languageId),
      supabase
        .from("public_submissions")
        .select("url, category, note")
        .eq("language_id", languageId)
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);
    setRepoLinks((repoResult.data as UrlListItem[]) ?? []);
    setRecentSubmissions((submissionsResult.data as UrlListItem[]) ?? []);
    setLoadingLists(false);
  }

  function handleSelectLanguage(language: LanguageRecord) {
    setSelected(language);
    setThanks(null);
    loadLists(language.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <Globe2 className="h-10 w-10 text-accent" aria-hidden />
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Share a website in your language
        </h1>
        <p className="max-w-md text-lg text-ink-soft">
          Help build a map of the web for every language — find yours and add a site you trust.
        </p>
      </header>

      <LanguagePicker
        languages={languages}
        loading={languages.length === 0}
        selected={selected}
        onSelect={handleSelectLanguage}
        onClear={() => setSelected(null)}
      />

      {!selected && (
        <div className="flex flex-col gap-4">
          <HowItWorks />
          <WhatToShare />
        </div>
      )}

      {selected &&
        (thanks ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-border bg-paper-raised p-8 text-center">
            <span className="text-5xl">🎉</span>
            <h2 className="text-2xl font-extrabold">
              Thanks! You shared {thanks.count} {thanks.count === 1 ? "link" : "links"} for{" "}
              {selected.refName}.
            </h2>
            <p className="text-lg text-ink-soft">
              {thanks.total} {thanks.total === 1 ? "link has" : "links have"} been shared for{" "}
              {selected.refName} so far.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {!loadingLists && (repoLinks.length > 0 || recentSubmissions.length > 0) && (
              <div className="flex flex-col gap-4">
                <UrlList
                  heading="Already on GitHub"
                  items={repoLinks}
                  emptyMessage="No confirmed sites yet for this language."
                />
                <UrlList
                  heading="Recently submitted here"
                  items={recentSubmissions}
                  emptyMessage="No one has submitted a site here yet — be the first!"
                />
              </div>
            )}

            <WhatToShare />

            <SubmissionForm
              languageId={selected.id}
              onSubmitted={(count) => {
                setThanks({ count, total: recentSubmissions.length + count });
                loadLists(selected.id);
              }}
            />
          </div>
        ))}
    </main>
  );
}

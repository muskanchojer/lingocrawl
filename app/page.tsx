"use client";

import { ArrowDown, Check, ChevronRight, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguagePicker } from "@/components/language-picker";
import { SubmissionForm } from "@/components/submission-form";
import { UrlList, type UrlListItem } from "@/components/url-list";
import { loadLanguages, type LanguageRecord } from "@/lib/languages";
import { fetchAllRows } from "@/lib/paging";
import { supabase } from "@/lib/supabase/client";

function SiteHeader() {
  return (
    <header className="bg-navy text-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5" aria-hidden />
          <span className="font-heading text-lg font-semibold">LingoCrawl</span>
        </div>
        <span className="hidden text-sm text-paper/75 sm:inline">
          Unofficial contribution form · ISO 639-3
        </span>
      </div>
    </header>
  );
}

// A stat that isn't resolved yet shows a skeleton; one that resolved to
// "unavailable" (the backing view doesn't exist until a migration runs)
// disappears rather than ever showing a permanent dash.
function StatStrip({
  totalLanguages,
  languagesWithSources,
  statsLoading,
}: {
  totalLanguages: number | null;
  languagesWithSources: number | null;
  statsLoading: boolean;
}) {
  const showSecond = statsLoading || languagesWithSources !== null;
  return (
    <p className="text-center text-lg text-ink-soft">
      We&apos;re already tracking{" "}
      <span className="font-mono tabular-data font-semibold text-ink">
        {totalLanguages === null ? "···" : totalLanguages.toLocaleString("en-US")}
      </span>{" "}
      languages
      {showSecond && (
        <>
          {" — "}
          {statsLoading ? (
            <span className="inline-block h-4 w-10 animate-pulse bg-border align-middle" aria-hidden />
          ) : (
            <span className="font-mono tabular-data font-semibold text-ink">
              {languagesWithSources!.toLocaleString("en-US")}
            </span>
          )}{" "}
          of them already have a source
        </>
      )}
      .
    </p>
  );
}

function HowItWorks() {
  return (
    <section>
      <h2 className="mb-3 font-heading text-xl font-semibold">How it works</h2>
      <ol className="flex flex-col gap-2 text-ink-soft">
        <li>
          <strong className="text-ink">1. Search your language</strong> — find it above, by name
          or an alternate spelling.
        </li>
        <li>
          <strong className="text-ink">2. Share a link</strong> — paste the address of a website
          written in it.
        </li>
        <li>
          <strong className="text-ink">3. Pick a category</strong> — news, culture, government,
          political, or other — then submit.
        </li>
      </ol>
    </section>
  );
}

// Paraphrased from the commoncrawl/web-languages README (CC0); the quoted
// sentence is verbatim from it.
function AboutProject() {
  return (
    <section>
      <h2 className="mb-2 font-heading text-xl font-semibold">About this project</h2>
      <p className="mb-3 text-ink-soft">
        LingoCrawl is an unofficial contribution form for{" "}
        <a
          href="https://github.com/commoncrawl/web-languages"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-navy underline underline-offset-2"
        >
          Common Crawl&apos;s web-languages project
        </a>
        , a crowd-sourced, public-domain effort to improve web crawling for
        under-resourced languages.
      </p>
      <blockquote className="mb-3 pl-1 font-heading text-xl italic leading-snug text-navy">
        &ldquo;We don&apos;t have enough of languages like Hindi (500 million speakers!), smaller
        country languages like Hungarian, and regional languages like Catalan. We are interested
        in languages from all over the world.&rdquo;
      </blockquote>
      <p className="text-ink-soft">
        Volunteers read through new links before adding them to the public-domain (CC0)
        web-languages list. The project also runs a{" "}
        <a
          href="https://discord.gg/njaVFh7avF"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-navy underline underline-offset-2"
        >
          Discord server
        </a>{" "}
        for discussion.
      </p>
    </section>
  );
}

// Adapted from the README's "What kind of websites are you looking for?" —
// shared between the full page section and the collapsible reading aid
// that repeats it beside the form.
function WhatToShareItems() {
  return (
    <>
      <li>
        Websites <strong className="text-ink">written in your language</strong>. A site that is
        all English is not what we need.
      </li>
      <li>
        Sites that are <strong className="text-ink">important and widely used</strong>. If many
        regions speak your language, try to include different regions.
      </li>
      <li>
        If your language is only <strong className="text-ink">one part of a site</strong>, share
        that exact address, for example{" "}
        <span className="whitespace-nowrap font-mono">example.com/catalan/</span>.
      </li>
      <li>
        If your language has its own <strong className="text-ink">Wikipedia</strong>, please add
        it under &ldquo;Other&rdquo;.
      </li>
      <li>Not sure? Do your best. You don&apos;t need to fill every category.</li>
    </>
  );
}

function WhatToShare() {
  return (
    <section>
      <h2 className="mb-3 font-heading text-xl font-semibold">What kind of websites help?</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-soft">
        <WhatToShareItems />
      </ul>
    </section>
  );
}

// A collapsible repeat of WhatToShare that sits beside the form, since
// that's the moment it actually matters.
function WhatToShareDetails() {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-navy marker:content-none">
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden
        />
        What kind of websites help?
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-ink-soft">
        <WhatToShareItems />
      </ul>
    </details>
  );
}

export default function Home() {
  const [languages, setLanguages] = useState<LanguageRecord[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [languagesWithSources, setLanguagesWithSources] = useState<number | null>(null);
  const [selected, setSelected] = useState<LanguageRecord | null>(null);
  const [repoLinks, setRepoLinks] = useState<UrlListItem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<UrlListItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [thanks, setThanks] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    loadLanguages().then(setLanguages);
  }, []);

  useEffect(() => {
    supabase
      .from("repo_links_stats")
      .select("languages_with_sources")
      .single()
      .then(({ data }) => {
        setLanguagesWithSources(data?.languages_with_sources ?? null);
        setStatsLoading(false);
      });
  }, []);

  async function loadLists(languageId: string) {
    setLoadingLists(true);
    const [repoRows, submissionsResult] = await Promise.all([
      fetchAllRows(async (from, to) => {
        const { data } = await supabase
          .from("repo_links")
          .select("url, category, note")
          .eq("language_id", languageId)
          .order("url")
          .range(from, to);
        return (data as UrlListItem[]) ?? [];
      }),
      supabase
        .from("public_submissions")
        .select("url, category, note")
        .eq("language_id", languageId)
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);
    setRepoLinks(repoRows);
    setRecentSubmissions((submissionsResult.data as UrlListItem[]) ?? []);
    setLoadingLists(false);
  }

  function handleSelectLanguage(language: LanguageRecord) {
    setSelected(language);
    setThanks(null);
    loadLists(language.id);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-10">
        {!selected ? (
          <>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
              <h1 className="font-heading text-4xl font-semibold">
                Share a website in your language
              </h1>
              <p className="text-ink-soft">
                Help build a map of the web for every language — find yours and add a site you
                trust.
              </p>
            </div>

            <LanguagePicker
              languages={languages}
              loading={languages.length === 0}
              selected={null}
              onSelect={handleSelectLanguage}
              onClear={() => setSelected(null)}
            />

            <StatStrip
              totalLanguages={languages.length || null}
              languagesWithSources={languagesWithSources}
              statsLoading={statsLoading}
            />

            <AboutProject />

            <HowItWorks />

            <WhatToShare />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <LanguagePicker
                languages={languages}
                selected={selected}
                onSelect={handleSelectLanguage}
                onClear={() => setSelected(null)}
              />
              {!loadingLists && !thanks && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 border border-verified px-2.5 py-1 text-sm font-medium text-verified">
                    <Check className="h-4 w-4" aria-hidden />
                    {repoLinks.length.toLocaleString("en-US")} listed
                  </span>
                  <a
                    href="#add-source"
                    className="inline-flex items-center gap-1 text-sm font-medium text-navy underline underline-offset-2"
                  >
                    Add a source
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              )}
            </div>

            {thanks ? (
              <div className="border-y border-verified py-8 text-center">
                <Check className="mx-auto mb-3 h-10 w-10 text-verified" aria-hidden />
                <h2 className="font-heading text-2xl font-semibold">
                  Thanks! You shared {thanks.count} {thanks.count === 1 ? "link" : "links"} for{" "}
                  {selected.refName}.
                </h2>
                <p className="mt-1 text-ink-soft">
                  {thanks.total} {thanks.total === 1 ? "link has" : "links have"} been shared for{" "}
                  {selected.refName} so far.
                </p>
                <button
                  type="button"
                  onClick={() => setThanks(null)}
                  className="mt-4 text-sm font-semibold text-navy underline underline-offset-2"
                >
                  Share another link for {selected.refName}
                </button>
              </div>
            ) : (
              <div key={selected.id} className="flex flex-col gap-8">
                {loadingLists ? (
                  <p className="text-ink-soft">Looking for sites already listed...</p>
                ) : (
                  <>
                    <UrlList
                      heading="Already listed"
                      items={repoLinks}
                      emptyMessage="No sites are listed for this language yet. You could be the first!"
                    />
                    <UrlList
                      heading="Recently submitted here"
                      items={recentSubmissions}
                      emptyMessage="No one has submitted a site here yet — be the first!"
                    />
                  </>
                )}

                <div id="add-source" className="scroll-mt-6 flex flex-col gap-4">
                  <h2 className="font-heading text-xl font-semibold">Add a source</h2>
                  <WhatToShareDetails />
                  <SubmissionForm
                    languageId={selected.id}
                    onSubmitted={async (count) => {
                      const { count: total } = await supabase
                        .from("public_submissions")
                        .select("*", { count: "exact", head: true })
                        .eq("language_id", selected.id);
                      setThanks({ count, total: total ?? count });
                      loadLists(selected.id);
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

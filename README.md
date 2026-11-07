# web-languages

**[web-languages.invisible.info](https://web-languages.invisible.info/)**

A website where anyone can share a website in their own language — no
account needed. It feeds Common Crawl's
[`web-languages`](https://github.com/commoncrawl/web-languages) project,
which is working to cover more of the world's ~7,900 languages on the web,
including ones that are small, regional, or easy to overlook.

Many languages barely have a presence online. If you know a news site,
government page, or community site in a language you speak, adding it
here helps that language show up where it currently doesn't.

## How to contribute

1. Open the [site](https://web-languages.invisible.info/) and
   search for your language — by name or by its 3-letter SIL code.
2. Paste the link to a website that's actually written in that language,
   with an optional note about what it is.
3. Send it. That's it — no sign-up, no GitHub account.

The site shows what's already listed for a language, so you can check
before adding one that's already there. New links are reviewed by us
before they are added.

## Reviewing submissions (for Moderators)

Every time someone sends links on the site, a new **issue** appears in our
GitHub repo with the `submission` label. Your job is to check whether each link is relevant.
No coding or GitHub experience needed. You
only need a GitHub account with access to this repo.

1. **Choose an open issue** from the Issues tab that has the `submission` label.
   You'll see a short list of links, each with an empty tick box next to it.
2. **Check each link properly.** Open it in a new tab (middle-click, or hold
   Ctrl on Windows / Cmd on Mac and click) so you don't lose the issue page.
3. **Tick the box** of the link(s) you want to keep. Do not tick the box for any
   link that you want to reject. 
4. **Optional:** want to explain a decision? Write a normal comment on the
   issue first. 
5. **Add the `validated` label** (right side of the issue → Labels → settings icon →
   `validated`). This is the last step of your review. An automated action handles the rest.
   Your ticked links are saved as accepted and the others as rejected and the issue is closed.

That's it. Don't close the issue yourself after step 5; the bot does it.
Added the label too early or by mistake? Tell a maintainer.

**Everything looks wrong?** You can reject the whole submission in either
way, and every link is recorded as rejected:
   - Don't tick any box. Just add the `validated` label, like usual, or
   - Close the issue as **"not planned"** (the button next to "Close issue").

To see every link in one place, open `data/all-links.csv` in Excel or Sheets. It lists the approved and upstream links per language. Rejected links are never in it. Approvals update it
automatically; the upstream part is a saved copy, so refresh it now and then
with `npm run refresh-all-links` and commit the result.

## For developers/maintainers

This repo is the engine behind the site above. It's a Next.js app on
[Railway](https://railway.com). There is no database: the language list
(names, ISO codes, other names) and the known links are both built from the
upstream Common Crawl's
[`web-languages`](https://github.com/commoncrawl/web-languages) repo, and submissions are GitHub
issues that end up in a CSV file in this repo.

```bash
npm install
npm run sync-repo-links   # once, to create the language and link files the site reads
npm run dev               # local copy for trying out a code change
                          # before it's pushed — the live site itself runs
                          # on Railway and is never started this way
```

Submitting links needs a `.env.local` file (gitignored). Copy
`.env.example` to `.env.local` and fill in two values:

```
GITHUB_TOKEN=
GITHUB_REPO=
```

`GITHUB_REPO` is the repo that receives submission issues, as `owner/name`.
`GITHUB_TOKEN` is a fine-grained personal access token limited to that one
repo, with **Issues: read and write** — keep it server-only and never
commit it. Set the same two values as Railway's service variables for the
live site. Without them the site still works, but sending a link fails.

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server, for working on the code |
| `npm run build` / `npm run start` | What Railway runs to serve the live site |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run sync-repo-links` | Rebuild `public/language-list.json`, `public/repo-links/` and `public/stats.json` from the live `web-languages` repo and `data/accepted.csv`, and copy `data/all-links.csv` to `public/` |
| `npm run refresh-all-links` | Re-download the `web-languages` repo and rewrite `data/all-links.csv` (upstream links plus everything in `data/accepted.csv`); commit the result |

**How submissions flow:**

1. A visitor sends links. The site opens **one issue** in `GITHUB_REPO`,
   labelled `submission` and `ui:<interface language>`, with the language
   code in its title.
   Links already listed upstream or already approved are dropped first.
2. A moderator reviews the issue (see "Reviewing submissions" above). The
   workflow in `.github/workflows/approve-submission.yml` then runs, in one of
   two ways:
   - **`validated` label added:** ticked links go to `data/accepted.csv`,
     unticked ones to `data/rejected.csv`, and `data/all-links.csv` is rebuilt.
     The files are committed to the default branch, then the issue gets a
     summary comment and is closed. The issue is only closed after the push
     succeeds, so a failed push never loses links.
   - **Issue closed as "not planned":** every link goes to
     `data/rejected.csv`, and nothing else changes.

   Railway redeploys on the commit.

Both CSV files have the columns `language_id`, `url`, `note`, `ui_locale` (the
visitor's interface language), `decided_at` and `issue` (a link to the issue
the row came from). A link already recorded is not added twice. The workflow
runs one at a time, uses only GitHub's built-in per-run token (no secret of
ours is stored on GitHub), and ignores labels added or issues closed by anyone
without write access.

The `validated` label has to exist in the repo. If it doesn't, create it
under Issues → Labels. GitHub creates `submission` and `ui:<language>` on its
own.

**Interface languages:** site content lives in `lib/i18n/messages/`, one file
per language, with `en.ts` as the source. To add a language, add
it to `lib/i18n/locales.ts`, add its content file, and register it in
`lib/i18n/load-messages.ts` — the typecheck will catch any missing text.
To change existing site content, just edit that language's file.

**Keeping the data fresh:** `npm run build` runs `sync-repo-links` first, so
every deploy pulls in the languages and links added upstream. To pick up
new upstream changes without a code change, redeploy on Railway. Each
upstream language file supplies its own name, other names, category and
ISO-639-3 code; the sync warns about any file that has no code. The
exception is `data/all-links.csv`: a deploy only copies the committed file, so
refresh it with `npm run refresh-all-links`.

**Deploying:** Railway auto-builds on push to the connected branch, with
`GITHUB_TOKEN` and `GITHUB_REPO` set as service variables before the first
build. The build fails if the upstream download fails, rather than shipping
a site with empty lists.

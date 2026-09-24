# LingoCrawlUI

A public contribution portal for Common Crawl's [`web-languages`](https://github.com/commoncrawl/web-languages)
project. Lets anyone search one of ~7,900 ISO-639-3 languages and submit a
website URL for it — no GitHub account needed. Submissions land in a
Supabase staging table for a small trusted team to review; this app has no
admin/reviewer UI at all.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Project Settings → API |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Same page — service role key, keep server-only |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile → add a widget |

### Database

Run `supabase/migrations/0001_init.sql`, then `0002_grants.sql`, against a Supabase project (SQL
Editor, or the Supabase CLI) to create `languages`, `repo_links`,
`submissions`, and the `public_submissions` view.

Then seed the language reference data and the known GitHub links:

```bash
npm run seed-languages     # writes public/languages.json + upserts `languages`
npm run sync-repo-links    # parses web-languages repo, upserts `repo_links`
```

Both scripts work without Supabase credentials too — they'll fetch/parse
and print stats without writing anything, which is useful for checking the
parser against the live repo.

## Reviewing submissions

There is no review UI in this app by design. Reviewers work directly in the
Supabase Table Editor: filter `submissions` by `status = 'pending'`, edit
`status`/`reviewed_by`/`reviewed_at` inline, and export to CSV periodically.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run seed-languages` | Seed the `languages` table + `public/languages.json` from SIL |
| `npm run sync-repo-links` | Sync `repo_links` from the live `web-languages` repo |

## Deployment

Deploy to Vercel with the same environment variables set in the project
settings. Re-run `npm run sync-repo-links` periodically to refresh
`repo_links`, and ping the Supabase project now and then so the free tier
doesn't pause from inactivity.

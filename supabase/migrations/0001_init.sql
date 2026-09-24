-- LingoCrawlUI initial schema.
-- languages + repo_links are read-only reference data written only by the
-- seed/sync scripts via the service-role key. submissions is the staging
-- table reviewers work from directly in the Supabase Table Editor.

create table languages (
  id text primary key,                 -- ISO-639-3 code, e.g. 'cat'
  ref_name text not null,
  alt_names text[] not null default '{}',
  language_type text not null check (language_type in ('living', 'extinct', 'historical', 'constructed', 'special')),
  repo_file_slug text
);

create table repo_links (
  id uuid primary key default gen_random_uuid(),
  language_id text not null references languages(id),
  url text not null,
  category text not null check (category in ('news', 'culture_history', 'government', 'political_parties', 'other')),
  note text,
  synced_at timestamptz not null default now(),
  unique (language_id, url)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  language_id text not null references languages(id),
  url text not null,
  category text not null check (category in ('news', 'culture_history', 'government', 'political_parties', 'other')),
  note text,
  contributor_name text,
  submitter_contact text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_by text,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now()
);

create index submissions_language_id_idx on submissions(language_id);
create index submissions_status_idx on submissions(status);
create index repo_links_language_id_idx on repo_links(language_id);

-- Public-facing view: no status/reviewer fields (safe for anonymous
-- visitors), and excludes rejected/duplicate rows so a reviewer's decision
-- in the Table Editor actually removes a link from the public list —
-- pending rows still show (intended: "recently submitted, not yet
-- reviewed" is the whole point of this list).
--
-- This view runs as its owner (Postgres's standard behavior for views,
-- sometimes called SECURITY DEFINER), which is what lets it read the
-- RLS-locked `submissions` table on behalf of anon/authenticated callers
-- who have no policy access to the base table themselves. That's
-- intentional here, not a mistake to "fix" with `security_invoker = true`
-- (which would break the view entirely, since invoker rights would apply
-- the callers' own zero-policy access to `submissions`).
create view public_submissions as
  select language_id, url, category, note, submitted_at
  from submissions
  where status not in ('rejected', 'duplicate');

alter table languages enable row level security;
alter table repo_links enable row level security;
alter table submissions enable row level security;

create policy "languages are publicly readable"
  on languages for select
  using (true);

create policy "repo_links are publicly readable"
  on repo_links for select
  using (true);

-- No policies on `submissions` at all: PostgREST denies all access to
-- anon/authenticated roles by default once RLS is enabled with zero
-- policies. All submission writes and the dedupe read go through the
-- server-only service-role client in the API route; the service role
-- bypasses RLS entirely. `public_submissions` is a view over `submissions`
-- and is independently granted below so anonymous visitors can read it
-- without any policy on the base table.
grant select on public_submissions to anon, authenticated;

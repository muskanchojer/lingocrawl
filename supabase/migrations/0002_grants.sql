-- Explicit table privileges. Row Level Security decides WHICH rows a role may
-- touch, but Postgres also requires a GRANT before the role can touch the
-- table at all. Supabase's "Automatically expose new tables" project setting
-- used to add these grants implicitly; with it turned off (Supabase's
-- recommendation), they have to be stated here.

-- Browser (anon key): read-only reference data. `submissions` is deliberately
-- NOT granted to anon/authenticated — it stays unreachable from the browser.
grant select on languages, repo_links to anon, authenticated;
grant select on public_submissions to anon, authenticated;

-- Server (secret / service_role key): the seed + sync scripts and the
-- /api/submit route. service_role bypasses RLS but still needs table grants.
grant all on languages, repo_links, submissions to service_role;

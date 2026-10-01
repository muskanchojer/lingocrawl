-- Precomputed stat for the landing page's "already have a source" callout.
-- Previously computed client-side by paging all of repo_links (thousands of
-- rows, ~6s) just to count distinct language_id — a view makes this one
-- fast query instead.
create view repo_links_stats as
  select count(distinct language_id) as languages_with_sources
  from repo_links;

grant select on repo_links_stats to anon, authenticated;

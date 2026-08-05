-- Every table in `public` is exposed through PostgREST, so a table without RLS
-- is readable AND writable by anyone holding the publishable (anon) key.
--
-- 0001 enabled RLS only on the user-scoped tables. The remaining five were left
-- open, which the Supabase security linter correctly flags as ERROR. The worst
-- of them is explanation_citations: `explanations` is protected but its join
-- table was not, so the citation graph could be read in bulk, and rows could be
-- INSERTED directly — bypassing validateCitations() entirely and defeating the
-- project's central guarantee that a fabricated citation cannot reach the UI.
--
-- These tables get RLS with NO policy, which denies anon and authenticated
-- outright. That is deliberate, not an oversight: all application access goes
-- through the service-role client in src/lib/db/client.ts, and the service role
-- bypasses RLS. Nothing reads these client-side today.
--
-- If a page later needs public market data, add a narrow read-only policy, e.g.
--   create policy public_read on securities for select using (true);
-- Grant select, never insert or update — corrupting price_history or betas would
-- silently corrupt attribution for every user.

alter table securities enable row level security;
alter table price_history enable row level security;
alter table betas enable row level security;
alter table articles enable row level security;
alter table explanation_citations enable row level security;

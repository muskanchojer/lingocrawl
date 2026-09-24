import { createClient } from "@supabase/supabase-js";

/** Browser client, anon key — read-only lookups (languages, repo_links,
 * public_submissions) that RLS allows anyone to select. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Server-only client, service-role key — the only path that may write to
 * `submissions` or read it unfiltered. Never import this from a component
 * that could end up in a client bundle. */
export function createAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

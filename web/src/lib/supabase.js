import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client — used from Client Components.
 * The publishable key is safe to expose here; row-level security
 * is what actually gates data access.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { hasSupabaseConfiguration } from "./storage-mode";
export function configured() {
  return hasSupabaseConfiguration();
}
export async function sessionClient() {
  if (!configured())
    throw new Error(
      "Supabase is not configured. Follow README.md to connect your project.",
    );
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            /* Server components rely on the auth refresh proxy. */
          }
        },
      },
    },
  );
}
export function adminClient() {
  if (!configured())
    throw new Error(
      "Online saving is unavailable until Supabase is configured.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

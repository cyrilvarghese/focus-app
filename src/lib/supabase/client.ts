import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {
  constructor() {
    super("Supabase isn't configured: copy .env.local.example to .env.local");
    this.name = "SupabaseConfigError";
  }
}

type Env = Record<string, string | undefined>;

export function readConfig(env: Env): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function supabaseFromEnv(env: Env): SupabaseClient {
  const cfg = readConfig(env);
  if (!cfg) throw new SupabaseConfigError();
  return createClient(cfg.url, cfg.key);
}

let shared: SupabaseClient | null = null;

/** One shared browser client. Next inlines NEXT_PUBLIC_* at build time, so they must be read as literals. */
export function getSupabase(): SupabaseClient {
  if (!shared) {
    shared = supabaseFromEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  }
  return shared;
}

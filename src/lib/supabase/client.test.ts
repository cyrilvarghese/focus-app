import { describe, expect, it } from "vitest";
import { readConfig, SupabaseConfigError, supabaseFromEnv } from "./client";

describe("readConfig", () => {
  it("returns both values when present", () => {
    expect(
      readConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" }),
    ).toEqual({ url: "https://x.supabase.co", key: "sb_publishable_1" });
  });
  it("returns null when either is missing or blank", () => {
    expect(readConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(readConfig({ NEXT_PUBLIC_SUPABASE_URL: " ", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" })).toBeNull();
  });
});

describe("supabaseFromEnv", () => {
  it("throws SupabaseConfigError with the setup hint when unconfigured", () => {
    expect(() => supabaseFromEnv({})).toThrow(SupabaseConfigError);
    expect(() => supabaseFromEnv({})).toThrow("copy .env.local.example to .env.local");
  });
  it("builds a client when configured", () => {
    const c = supabaseFromEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" });
    expect(typeof c.auth.getSession).toBe("function");
  });
});

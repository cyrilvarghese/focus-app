import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestError = "guest_signin_disabled" | "network";
export type GuestResult = { userId: string } | { error: GuestError };

/**
 * Guest-first identity (PRD §9): reuse the stored session, otherwise sign in anonymously.
 * Anonymous users get the `authenticated` role, which the RLS policies and RPC grants expect.
 */
export async function ensureGuest(client: SupabaseClient): Promise<GuestResult> {
  try {
    const { data } = await client.auth.getSession();
    if (data.session?.user) return { userId: data.session.user.id };

    const res = await client.auth.signInAnonymously();
    if (res.error) {
      return { error: res.error.code === "anonymous_provider_disabled" ? "guest_signin_disabled" : "network" };
    }
    if (!res.data.user) return { error: "network" };
    return { userId: res.data.user.id };
  } catch {
    return { error: "network" };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureGuest } from "./auth";

type FakeOpts = {
  session?: { user: { id: string } } | null;
  signIn?: { user: { id: string } | null; error: { code?: string; message: string } | null };
  getSessionThrows?: boolean;
};

function fake(o: FakeOpts) {
  const getSession = vi.fn(async () => {
    if (o.getSessionThrows) throw new TypeError("Failed to fetch");
    return { data: { session: o.session ?? null }, error: null };
  });
  const signInAnonymously = vi.fn(async () => ({
    data: { user: o.signIn?.user ?? null, session: null },
    error: o.signIn?.error ?? null,
  }));
  const client = { auth: { getSession, signInAnonymously } } as unknown as SupabaseClient;
  return { client, getSession, signInAnonymously };
}

describe("ensureGuest", () => {
  it("reuses an existing session without signing in", async () => {
    const f = fake({ session: { user: { id: "u1" } } });
    expect(await ensureGuest(f.client)).toEqual({ userId: "u1" });
    expect(f.signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when there is no session", async () => {
    const f = fake({ session: null, signIn: { user: { id: "u2" }, error: null } });
    expect(await ensureGuest(f.client)).toEqual({ userId: "u2" });
    expect(f.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("maps a disabled anonymous provider", async () => {
    const f = fake({ session: null, signIn: { user: null, error: { code: "anonymous_provider_disabled", message: "Anonymous sign-ins are disabled" } } });
    expect(await ensureGuest(f.client)).toEqual({ error: "guest_signin_disabled" });
  });

  it("maps any other sign-in failure to network", async () => {
    const f = fake({ session: null, signIn: { user: null, error: { message: "boom" } } });
    expect(await ensureGuest(f.client)).toEqual({ error: "network" });
  });

  it("maps a thrown fetch error to network", async () => {
    const f = fake({ getSessionThrows: true });
    expect(await ensureGuest(f.client)).toEqual({ error: "network" });
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPod, getMyProfile, getPod, podErrorMessage } from "./pods";

type Result = { data: unknown; error: { message: string } | null };

/** A tiny query builder: every chained call returns itself, and maybeSingle resolves the configured result. */
function fakeClient(o: { rpc?: Result; rows?: Record<string, Result> }) {
  const calls: { table?: string; select?: string; eq?: [string, unknown] }[] = [];
  const from = vi.fn((table: string) => {
    const call: (typeof calls)[number] = { table };
    calls.push(call);
    const b = {
      select: vi.fn((cols: string) => ((call.select = cols), b)),
      eq: vi.fn((col: string, v: unknown) => ((call.eq = [col, v]), b)),
      maybeSingle: vi.fn(async () => o.rows?.[table] ?? { data: null, error: null }),
    };
    return b;
  });
  const rpc = vi.fn(async () => o.rpc ?? { data: null, error: null });
  return { client: { from, rpc } as unknown as SupabaseClient, from, rpc, calls };
}

const input = { name: " The afternoon pod ", focusMin: 25, breakMin: 5, rounds: 2, animal: "bunny", displayName: "Ashna", focusText: "Pitch deck" } as const;

describe("createPod", () => {
  it("passes the RPC arguments through and returns the slug", async () => {
    const f = fakeClient({ rpc: { data: "k7m2pq", error: null } });
    expect(await createPod(f.client, input)).toEqual({ slug: "k7m2pq" });
    expect(f.rpc).toHaveBeenCalledWith("create_pod", {
      p_name: " The afternoon pod ",
      p_focus_min: 25,
      p_break_min: 5,
      p_rounds: 2,
      p_animal: "bunny",
      p_display_name: "Ashna",
      p_focus_text: "Pitch deck",
    });
  });

  it("maps a known error code", async () => {
    const f = fakeClient({ rpc: { data: null, error: { message: "invalid_display_name" } } });
    expect(await createPod(f.client, input)).toEqual({ error: "invalid_display_name" });
  });

  it("maps unknown errors and missing data to network", async () => {
    expect(await createPod(fakeClient({ rpc: { data: null, error: { message: "FetchError" } } }).client, input)).toEqual({ error: "network" });
    expect(await createPod(fakeClient({ rpc: { data: null, error: null } }).client, input)).toEqual({ error: "network" });
  });
});

describe("getPod", () => {
  it("returns null when the select is empty", async () => {
    const f = fakeClient({});
    expect(await getPod(f.client, "nope")).toBeNull();
    expect(f.calls[0]).toMatchObject({ table: "pods", eq: ["slug", "nope"] });
    expect(f.calls[0].select).toContain("pod_members");
  });

  it("returns the pod with members sorted by joined_at", async () => {
    const row = {
      id: "p1", slug: "k7m2pq", name: "The afternoon pod", host_id: "u1", focus_min: 25, break_min: 5, rounds: 2,
      pod_members: [
        { user_id: "u2", display_name: "Maya", animal: "cat", focus_text: "", joined_at: "2026-09-22T10:01:00Z" },
        { user_id: "u1", display_name: "Cyril", animal: "dog", focus_text: "Plan", joined_at: "2026-09-22T10:00:00Z" },
      ],
    };
    const f = fakeClient({ rows: { pods: { data: row, error: null } } });
    const r = await getPod(f.client, "k7m2pq");
    expect(r?.pod).toEqual({ id: "p1", slug: "k7m2pq", name: "The afternoon pod", host_id: "u1", focus_min: 25, break_min: 5, rounds: 2 });
    expect(r?.members.map((m) => m.user_id)).toEqual(["u1", "u2"]);
  });
});

describe("getMyProfile", () => {
  it("returns null when absent and the row when present", async () => {
    expect(await getMyProfile(fakeClient({}).client, "u1")).toBeNull();
    const f = fakeClient({ rows: { profiles: { data: { id: "u1", name: "Ashna", animal: "bunny" }, error: null } } });
    expect(await getMyProfile(f.client, "u1")).toEqual({ id: "u1", name: "Ashna", animal: "bunny" });
    expect(f.calls[0]).toMatchObject({ table: "profiles", eq: ["id", "u1"] });
  });
});

describe("podErrorMessage", () => {
  it("has friendly text for every code", () => {
    expect(podErrorMessage("network")).toBe("Can't reach Focuspal right now.");
    expect(podErrorMessage("invalid_name")).toBe("Give your pod a name (up to 40 characters).");
  });
});

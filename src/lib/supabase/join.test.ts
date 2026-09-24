import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getPodPreview, joinErrorMessage, joinPod } from "./join";
import { watchPod } from "./live";

type Result = { data: unknown; error: { message: string } | null };

function fakeClient(result: Result | Error) {
  const rpc = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const preview = {
  slug: "k7m2pq",
  name: "The afternoon pod",
  host_name: "Cyril",
  members: [
    { animal: "dog", display_name: "Cyril" },
    { animal: "cat", display_name: "Maya" },
  ],
  full: false,
  is_member: false,
};

describe("getPodPreview", () => {
  it("maps the pod, who's seated and the flags", async () => {
    const f = fakeClient({ data: preview, error: null });
    expect(await getPodPreview(f.client, "k7m2pq")).toEqual({
      slug: "k7m2pq",
      name: "The afternoon pod",
      hostName: "Cyril",
      takenBy: { dog: "Cyril", cat: "Maya" },
      seated: ["Cyril", "Maya"],
      full: false,
      isMember: false,
    });
    expect(f.rpc).toHaveBeenCalledWith("pod_preview", { p_slug: "k7m2pq" });
  });

  it("returns null for an unknown link, an error or a thrown request", async () => {
    expect(await getPodPreview(fakeClient({ data: null, error: null }).client, "nope")).toBeNull();
    expect(await getPodPreview(fakeClient({ data: null, error: { message: "boom" } }).client, "x")).toBeNull();
    expect(await getPodPreview(fakeClient(new TypeError("Failed to fetch")).client, "x")).toBeNull();
  });

  it("ignores a pal it doesn't know", async () => {
    const f = fakeClient({ data: { ...preview, members: [{ animal: "fox", display_name: "Sam" }] }, error: null });
    const r = await getPodPreview(f.client, "k7m2pq");
    expect(r?.takenBy).toEqual({});
    expect(r?.seated).toEqual(["Sam"]);
  });
});

describe("joinPod", () => {
  const input = { slug: "k7m2pq", animal: "bunny" as const, displayName: "Ashna", focusText: "Pitch deck", tags: ["Design"] };

  it("passes the seat through", async () => {
    const f = fakeClient({ data: null, error: null });
    expect(await joinPod(f.client, input)).toEqual({ ok: true });
    expect(f.rpc).toHaveBeenCalledWith("join_pod", {
      p_slug: "k7m2pq",
      p_animal: "bunny",
      p_display_name: "Ashna",
      p_focus_text: "Pitch deck",
      p_tags: ["Design"],
    });
  });

  it("maps the seat-taking races and unknown errors", async () => {
    expect(await joinPod(fakeClient({ data: null, error: { message: "pal_taken" } }).client, input)).toEqual({ error: "pal_taken" });
    expect(await joinPod(fakeClient({ data: null, error: { message: "pod_full" } }).client, input)).toEqual({ error: "pod_full" });
    expect(await joinPod(fakeClient({ data: null, error: { message: "kaboom" } }).client, input)).toEqual({ error: "network" });
    expect(await joinPod(fakeClient(new TypeError("Failed to fetch")).client, input)).toEqual({ error: "network" });
  });
});

describe("joinErrorMessage", () => {
  it("has friendly text", () => {
    expect(joinErrorMessage("pal_taken")).toBe("Someone just took that pal. Pick another.");
    expect(joinErrorMessage("pod_full")).toBe("This pod is full.");
  });
});

describe("watchPod", () => {
  it("listens for seats and sessions in this pod, and unsubscribes", () => {
    const on = vi.fn();
    const subscribe = vi.fn();
    const channel = { on, subscribe };
    on.mockReturnValue(channel);
    subscribe.mockReturnValue(channel);
    const removeChannel = vi.fn();
    const client = { channel: vi.fn(() => channel), removeChannel } as unknown as SupabaseClient;

    const onChange = vi.fn();
    const stop = watchPod(client, "p1", onChange);

    expect(on).toHaveBeenCalledTimes(2);
    const tables = on.mock.calls.map((c) => (c[1] as { table: string; filter: string }).table);
    const filters = on.mock.calls.map((c) => (c[1] as { table: string; filter: string }).filter);
    expect(tables).toEqual(["pod_members", "sessions"]);
    expect(filters).toEqual(["pod_id=eq.p1", "pod_id=eq.p1"]);
    expect(subscribe).toHaveBeenCalled();

    stop();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});

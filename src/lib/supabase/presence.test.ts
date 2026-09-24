import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { flattenPresence, joinPresence } from "./presence";

describe("flattenPresence", () => {
  it("takes one state per person, preferring focusing across their tabs", () => {
    expect(
      flattenPresence({
        maya: [{ status: "away" }, { status: "focusing" }],
        leo: [{ status: "lobby" }],
        sam: [{ status: "nonsense" }],
        ashna: [],
      }),
    ).toEqual({ maya: "focusing", leo: "lobby" });
  });
});

function fakeChannel() {
  const handlers: Record<string, () => void> = {};
  let subscribed: ((s: string) => void) | null = null;
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, cb: () => void) => {
      handlers[filter.event] = cb;
      return channel;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      subscribed = cb;
      return channel;
    }),
    track: vi.fn(async () => "ok"),
    untrack: vi.fn(async () => "ok"),
    presenceState: vi.fn(() => ({ maya: [{ status: "focusing" }] })),
  };
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
  return {
    channel,
    client: client as unknown as SupabaseClient,
    raw: client,
    connect: () => subscribed?.("SUBSCRIBED"),
    sync: () => handlers.sync?.(),
  };
}

describe("joinPresence", () => {
  it("joins the pod's channel keyed by you, and announces once connected", () => {
    const f = fakeChannel();
    joinPresence(f.client, "p1", "me", "lobby", () => {});
    expect(f.raw.channel).toHaveBeenCalledWith("presence:p1", { config: { presence: { key: "me" } } });
    expect(f.channel.track).not.toHaveBeenCalled();
    f.connect();
    expect(f.channel.track).toHaveBeenCalledWith({ status: "lobby" });
  });

  it("reports everyone's state on sync", () => {
    const f = fakeChannel();
    const onSync = vi.fn();
    joinPresence(f.client, "p1", "me", "lobby", onSync);
    f.sync();
    expect(onSync).toHaveBeenCalledWith({ maya: "focusing" });
  });

  it("sends changes only once connected, and only when the state changes", () => {
    const f = fakeChannel();
    const h = joinPresence(f.client, "p1", "me", "lobby", () => {});
    h.update("focusing"); // before connecting: remembered, not sent
    expect(f.channel.track).not.toHaveBeenCalled();
    f.connect();
    expect(f.channel.track).toHaveBeenLastCalledWith({ status: "focusing" });
    h.update("focusing");
    expect(f.channel.track).toHaveBeenCalledTimes(1);
    h.update("away");
    expect(f.channel.track).toHaveBeenLastCalledWith({ status: "away" });
  });

  it("leaves cleanly", () => {
    const f = fakeChannel();
    const h = joinPresence(f.client, "p1", "me", "lobby", () => {});
    h.leave();
    expect(f.channel.untrack).toHaveBeenCalled();
    expect(f.raw.removeChannel).toHaveBeenCalledWith(f.channel);
  });
});

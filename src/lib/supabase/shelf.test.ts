import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PRESET, MIN_MS, type Session } from "@/lib/clock";
import { pieceFor } from "@/lib/pottery";
import { getMyShelf, getSessionMinutes } from "./shelf";

type Result = { data: unknown; error: { message: string } | null };

/** The builder resolves when awaited, so a query without maybeSingle works too. */
function fakeClient(rows: Record<string, Result>) {
  const calls: { table: string; filters: [string, string, unknown][] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table, filters: [] as [string, string, unknown][] };
    calls.push(call);
    const result = rows[table] ?? { data: [], error: null };
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn((c: string, v: unknown) => (call.filters.push(["eq", c, v]), b)),
      in: vi.fn((c: string, v: unknown) => (call.filters.push(["in", c, v]), b)),
      limit: vi.fn(() => b),
      then: (res: (r: Result) => unknown) => Promise.resolve(result).then(res),
    };
    return b;
  });
  return { client: { from } as unknown as SupabaseClient, calls };
}

const START = Date.parse("2026-09-24T10:00:00.000Z");
const END = START + 55 * MIN_MS; // 25/5 × 2
const sessionRow = (id: string, endedAt: string | null, podName = "The afternoon pod") => ({
  id,
  pod_id: "p1",
  started_by: "u1",
  focus_min: 25,
  break_min: 5,
  rounds: 2,
  speed: 1,
  started_at: new Date(START).toISOString(),
  ended_at: endedAt,
  pods: { name: podName },
});

describe("getMyShelf", () => {
  it("returns the pots you kept, newest first, with your minutes", async () => {
    const older = sessionRow("s-old", new Date(END - 86_400_000).toISOString(), "Morning pod");
    const newer = sessionRow("s-new", new Date(END).toISOString());
    const f = fakeClient({
      session_members: { data: [{ present_at_end: true, sessions: older }, { present_at_end: true, sessions: newer }], error: null },
      focus_intervals: {
        data: [
          { session_id: "s-new", user_id: "u1", started_at: new Date(START).toISOString(), ended_at: new Date(START + 25 * MIN_MS).toISOString() },
          { session_id: "s-old", user_id: "u1", started_at: new Date(START).toISOString(), ended_at: new Date(START + 10 * MIN_MS).toISOString() },
        ],
        error: null,
      },
    });

    const shelf = await getMyShelf(f.client, "u1");
    expect(shelf.map((i) => i.sessionId)).toEqual(["s-new", "s-old"]);
    expect(shelf[0]).toMatchObject({ podName: "The afternoon pod", minutes: 25, ...pieceFor("s-new") });
    expect(shelf[1]).toMatchObject({ podName: "Morning pod", minutes: 10 });
    expect(f.calls[0].filters).toEqual([
      ["eq", "user_id", "u1"],
      ["eq", "present_at_end", true],
    ]);
  });

  it("skips sessions that never ended, and returns nothing when there are none", async () => {
    const open = fakeClient({ session_members: { data: [{ present_at_end: true, sessions: sessionRow("s1", null) }], error: null } });
    expect(await getMyShelf(open.client, "u1")).toEqual([]);
    expect(await getMyShelf(fakeClient({}).client, "u1")).toEqual([]);
  });

  it("returns nothing when the read fails", async () => {
    const f = fakeClient({ session_members: { data: null, error: { message: "boom" } } });
    expect(await getMyShelf(f.client, "u1")).toEqual([]);
  });
});

describe("getSessionMinutes", () => {
  const session: Session = { id: "s1", startedAtMs: START, preset: DEFAULT_PRESET };

  it("counts each member's focused minutes, ignoring break time", async () => {
    const f = fakeClient({
      focus_intervals: {
        data: [
          // u1: all the way through, so both 25-minute rounds count but the break doesn't
          { session_id: "s1", user_id: "u1", started_at: new Date(START).toISOString(), ended_at: new Date(END).toISOString() },
          // u2: the first round only
          { session_id: "s1", user_id: "u2", started_at: new Date(START).toISOString(), ended_at: new Date(START + 25 * MIN_MS).toISOString() },
        ],
        error: null,
      },
    });
    expect(await getSessionMinutes(f.client, "s1", session, END)).toEqual({ u1: 50, u2: 25 });
  });

  it("returns nothing when the read fails", async () => {
    const f = fakeClient({ focus_intervals: { data: null, error: { message: "boom" } } });
    expect(await getSessionMinutes(f.client, "s1", session, END)).toEqual({});
  });
});

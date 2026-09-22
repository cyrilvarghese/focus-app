import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  finishSession,
  getMyResult,
  getOpenSession,
  heartbeat,
  leaveSession,
  sessionErrorMessage,
  type SessionRow,
  startSession,
  toClockSession,
} from "./sessions";

type Result = { data: unknown; error: { message: string } | null };

const row: SessionRow = {
  id: "s1",
  pod_id: "p1",
  started_by: "u1",
  focus_min: 25,
  break_min: 5,
  rounds: 2,
  speed: 60,
  started_at: "2026-09-22T10:00:00.000Z",
  ended_at: null,
};

/** Every chained call returns the builder; maybeSingle resolves the table's configured result. */
function fakeClient(o: { rpc?: Result | Error; rows?: Record<string, Result> }) {
  const calls: { table: string; filters: [string, string, unknown][] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table, filters: [] as [string, string, unknown][] };
    calls.push(call);
    const b = {
      select: vi.fn(() => b),
      eq: vi.fn((col: string, v: unknown) => (call.filters.push(["eq", col, v]), b)),
      is: vi.fn((col: string, v: unknown) => (call.filters.push(["is", col, v]), b)),
      maybeSingle: vi.fn(async () => o.rows?.[table] ?? { data: null, error: null }),
    };
    return b;
  });
  const rpc = vi.fn(async () => {
    if (o.rpc instanceof Error) throw o.rpc;
    return o.rpc ?? { data: null, error: null };
  });
  return { client: { from, rpc } as unknown as SupabaseClient, rpc, calls };
}

describe("toClockSession", () => {
  it("converts a row to the clock's session", () => {
    expect(toClockSession(row)).toEqual({
      id: "s1",
      startedAtMs: Date.parse("2026-09-22T10:00:00.000Z"),
      preset: { focusMin: 25, breakMin: 5, rounds: 2 },
      speed: 60,
    });
  });
});

describe("startSession", () => {
  it("passes the pod and speed through and returns the row", async () => {
    const f = fakeClient({ rpc: { data: row, error: null } });
    expect(await startSession(f.client, "p1", 60)).toEqual({ session: row });
    expect(f.rpc).toHaveBeenCalledWith("start_session", { p_pod_id: "p1", p_speed: 60 });
  });
  it("defaults to normal speed", async () => {
    const f = fakeClient({ rpc: { data: row, error: null } });
    await startSession(f.client, "p1");
    expect(f.rpc).toHaveBeenCalledWith("start_session", { p_pod_id: "p1", p_speed: 1 });
  });
  it("maps known codes, and unknown or thrown errors to network", async () => {
    expect(await startSession(fakeClient({ rpc: { data: null, error: { message: "session_running" } } }).client, "p1")).toEqual({ error: "session_running" });
    expect(await startSession(fakeClient({ rpc: { data: null, error: { message: "boom" } } }).client, "p1")).toEqual({ error: "network" });
    expect(await startSession(fakeClient({ rpc: new TypeError("Failed to fetch") }).client, "p1")).toEqual({ error: "network" });
    expect(await startSession(fakeClient({ rpc: { data: null, error: null } }).client, "p1")).toEqual({ error: "network" });
  });
});

describe("heartbeat", () => {
  it("returns the server time in ms", async () => {
    const f = fakeClient({ rpc: { data: "2026-09-22T10:00:05.250+00:00", error: null } });
    expect(await heartbeat(f.client, "s1")).toEqual({ serverMs: Date.parse("2026-09-22T10:00:05.250Z") });
    expect(f.rpc).toHaveBeenCalledWith("heartbeat", { p_session_id: "s1" });
  });
  it("maps errors", async () => {
    expect(await heartbeat(fakeClient({ rpc: { data: null, error: { message: "not_in_session" } } }).client, "s1")).toEqual({ error: "not_in_session" });
    expect(await heartbeat(fakeClient({ rpc: { data: "not a date", error: null } }).client, "s1")).toEqual({ error: "network" });
  });
});

describe("leaveSession and finishSession", () => {
  it("call their functions and report ok", async () => {
    const f = fakeClient({ rpc: { data: null, error: null } });
    expect(await leaveSession(f.client, "s1")).toEqual({ ok: true });
    expect(f.rpc).toHaveBeenLastCalledWith("leave_session", { p_session_id: "s1" });
    expect(await finishSession(f.client, "s1")).toEqual({ ok: true });
    expect(f.rpc).toHaveBeenLastCalledWith("finish_session", { p_session_id: "s1" });
  });
  it("maps not_over", async () => {
    expect(await finishSession(fakeClient({ rpc: { data: null, error: { message: "not_over" } } }).client, "s1")).toEqual({ error: "not_over" });
  });
});

describe("getOpenSession", () => {
  it("reads the pod's session that hasn't ended", async () => {
    const f = fakeClient({ rows: { sessions: { data: row, error: null } } });
    expect(await getOpenSession(f.client, "p1")).toEqual(row);
    expect(f.calls[0]).toEqual({ table: "sessions", filters: [["eq", "pod_id", "p1"], ["is", "ended_at", null]] });
  });
  it("returns null when there is none", async () => {
    expect(await getOpenSession(fakeClient({}).client, "p1")).toBeNull();
  });
});

describe("getMyResult", () => {
  it("returns present_at_end, or null when not recorded", async () => {
    const f = fakeClient({ rows: { session_members: { data: { present_at_end: true }, error: null } } });
    expect(await getMyResult(f.client, "s1", "u1")).toBe(true);
    expect(f.calls[0].filters).toEqual([["eq", "session_id", "s1"], ["eq", "user_id", "u1"]]);
    expect(await getMyResult(fakeClient({}).client, "s1", "u1")).toBeNull();
  });
});

describe("sessionErrorMessage", () => {
  it("has friendly text", () => {
    expect(sessionErrorMessage("not_host")).toBe("Only the organizer can start the session.");
    expect(sessionErrorMessage("network")).toBe("Can't reach Focuspal right now.");
  });
});

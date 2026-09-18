import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, MIN_MS, type Session } from "@/lib/clock";
import { pieceFor } from "./piece";
import { potteryView } from "./view";

const session: Session = { id: "session-1", startedAtMs: 0, preset: DEFAULT_PRESET };
const solo = { presentCount: 1, memberCount: 1 };

describe("potteryView", () => {
  it("throws toward the session's piece during focus", () => {
    const v = potteryView(session, 10 * MIN_MS, solo);
    expect(v).toEqual({ ...pieceFor("session-1"), progress: 0.2, running: true, pace: 1, status: "throwing" });
  });

  it("stops the wheel during a break", () => {
    const v = potteryView(session, 27 * MIN_MS, solo);
    expect(v.running).toBe(false);
    expect(v.status).toBe("throwing");
    expect(v.progress).toBe(0.5);
  });

  it("completes at the end when someone is present", () => {
    const v = potteryView(session, 55 * MIN_MS, solo);
    expect(v.status).toBe("complete");
    expect(v.progress).toBe(1);
    expect(v.running).toBe(false);
  });

  it("is abandoned at the end when nobody is present", () => {
    expect(potteryView(session, 55 * MIN_MS, { presentCount: 0, memberCount: 3 }).status).toBe("abandoned");
  });

  it("is abandoned as soon as the session is left", () => {
    const v = potteryView(session, 10 * MIN_MS, { ...solo, left: true });
    expect(v.status).toBe("abandoned");
    expect(v.running).toBe(false);
  });

  it("slows with the share of members focusing", () => {
    expect(potteryView(session, 10 * MIN_MS, { presentCount: 2, memberCount: 4 }).pace).toBe(0.5);
    expect(potteryView(session, 10 * MIN_MS, { presentCount: 0, memberCount: 0 }).pace).toBe(0);
  });
});

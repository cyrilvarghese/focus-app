import { describe, expect, it } from "vitest";
import { focusWindows, phaseAt, type Session } from "./phase";
import { DEFAULT_PRESET, MIN_MS } from "./preset";

const S = 1_000_000;
const session: Session = { id: "s1", startedAtMs: S, preset: DEFAULT_PRESET }; // 25/5 × 2 = 55 min
const at = (min: number, extraMs = 0) => phaseAt(session, S + min * MIN_MS + extraMs);

describe("focusWindows", () => {
  it("lists each focus round in absolute time", () => {
    expect(focusWindows(session)).toEqual([
      { round: 1, startMs: S, endMs: S + 25 * MIN_MS },
      { round: 2, startMs: S + 30 * MIN_MS, endMs: S + 55 * MIN_MS },
    ]);
  });
});

describe("phaseAt", () => {
  it("starts in focus round 1 with no progress", () => {
    expect(at(0)).toEqual({ phase: "focus", round: 1, remainingMs: 25 * MIN_MS, focusProgress: 0 });
  });

  it("is still focus one ms before the break", () => {
    const s = at(25, -1);
    expect(s.phase).toBe("focus");
    expect(s.remainingMs).toBe(1);
    expect(s.focusProgress).toBeCloseTo((25 * MIN_MS - 1) / (50 * MIN_MS));
  });

  it("enters the break exactly at the end of focus", () => {
    expect(at(25)).toEqual({ phase: "break", round: 1, remainingMs: 5 * MIN_MS, focusProgress: 0.5 });
  });

  it("holds focus progress steady during the break", () => {
    expect(at(27)).toEqual({ phase: "break", round: 1, remainingMs: 3 * MIN_MS, focusProgress: 0.5 });
  });

  it("starts round 2 after the break", () => {
    expect(at(30)).toEqual({ phase: "focus", round: 2, remainingMs: 25 * MIN_MS, focusProgress: 0.5 });
  });

  it("is in the last ms of the last round just before the end", () => {
    const s = at(55, -1);
    expect(s.phase).toBe("focus");
    expect(s.round).toBe(2);
    expect(s.remainingMs).toBe(1);
  });

  it("is done exactly at the end", () => {
    expect(at(55)).toEqual({ phase: "done", round: 2, remainingMs: 0, focusProgress: 1 });
  });

  it("stays done long after the end", () => {
    expect(at(500).phase).toBe("done");
  });

  it("treats a time before the start as the start", () => {
    expect(at(-5)).toEqual(at(0));
  });

  it("has no break in a one-round session", () => {
    const one: Session = { id: "s2", startedAtMs: S, preset: { focusMin: 15, breakMin: 10, rounds: 1 } };
    expect(phaseAt(one, S + 15 * MIN_MS - 1).phase).toBe("focus");
    expect(phaseAt(one, S + 15 * MIN_MS).phase).toBe("done");
  });

  it("lets a late joiner land at the right remaining time", () => {
    // joining 37 min in: round 2, 7 min into focus
    expect(at(37)).toEqual({ phase: "focus", round: 2, remainingMs: 18 * MIN_MS, focusProgress: 32 / 50 });
  });
});

describe("fast mode (speed)", () => {
  const fast: Session = { id: "f", startedAtMs: S, preset: DEFAULT_PRESET, speed: 60 };

  it("runs a minute of session time per real second", () => {
    expect(phaseAt(fast, S + 25_000)).toEqual({ phase: "break", round: 1, remainingMs: 5 * MIN_MS, focusProgress: 0.5 });
    expect(phaseAt(fast, S + 55_000).phase).toBe("done");
  });

  it("puts focus windows in real time", () => {
    expect(focusWindows(fast)).toEqual([
      { round: 1, startMs: S, endMs: S + 25_000 },
      { round: 2, startMs: S + 30_000, endMs: S + 55_000 },
    ]);
  });

  it("treats a missing speed as 1", () => {
    expect(phaseAt({ ...fast, speed: undefined }, S + 25_000).phase).toBe("focus");
  });
});

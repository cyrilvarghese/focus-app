import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, MIN_MS, type Session } from "@/lib/clock";
import { palMinutes, potOutcome, type FocusInterval } from "./outcome";

// 25/5 × 2 starting at 0: focus 0–25 min and 30–55 min
const session: Session = { id: "s", startedAtMs: 0, preset: DEFAULT_PRESET };
const m = (min: number) => min * MIN_MS;
const iv = (userId: string, from: number, to: number | null): FocusInterval => ({
  userId,
  startMs: m(from),
  endMs: to === null ? null : m(to),
});
const END = m(55);

describe("palMinutes", () => {
  it("counts a full session as all its focus time", () => {
    expect(palMinutes([iv("a", 0, 55)], session, END)).toBe(50);
  });

  it("excludes time spent in the break", () => {
    expect(palMinutes([iv("a", 20, 35)], session, END)).toBe(10);
  });

  it("counts the same user in two tabs once", () => {
    expect(palMinutes([iv("a", 0, 10), iv("a", 5, 15)], session, END)).toBe(15);
  });

  it("sums different users even when they overlap", () => {
    expect(palMinutes([iv("a", 0, 10), iv("b", 0, 10)], session, END)).toBe(20);
  });

  it("caps an open interval at now", () => {
    expect(palMinutes([iv("a", 0, null)], session, m(12))).toBe(12);
  });

  it("ignores zero-length and reversed intervals", () => {
    expect(palMinutes([iv("a", 10, 10), iv("a", 10, 5)], session, END)).toBe(0);
  });

  it("floors to whole minutes", () => {
    expect(palMinutes([{ userId: "a", startMs: 0, endMs: 90_000 }], session, END)).toBe(1);
  });
});

describe("potOutcome", () => {
  it("discards the pot when nobody is present at the end", () => {
    expect(potOutcome([])).toEqual({ kept: false, recipients: [] });
  });

  it("keeps it for exactly the people present", () => {
    expect(potOutcome(["a", "c"])).toEqual({ kept: true, recipients: ["a", "c"] });
  });

  it("lists each recipient once", () => {
    expect(potOutcome(["a", "a", "b"])).toEqual({ kept: true, recipients: ["a", "b"] });
  });
});

import { describe, expect, it } from "vitest";
import type { ClockState } from "@/lib/clock";
import { caption, listNames, peekTitle, STAGE_NAMES, subtitle } from "./copy";

const focus = (round: number): ClockState => ({ phase: "focus", round, remainingMs: 1, focusProgress: 0 });
const base = { phase: "focus" as const, stage: "Walls pulled up", meAway: false, dozing: [], outcome: "pending" as const };

describe("listNames", () => {
  it("joins one, two and three names", () => {
    expect(listNames(["Maya"])).toBe("Maya");
    expect(listNames(["Leo", "Maya"])).toBe("Leo & Maya");
    expect(listNames(["Leo", "Maya", "Ashna"])).toBe("Leo, Maya & Ashna");
  });
});

describe("subtitle", () => {
  it("names the round and what comes next", () => {
    expect(subtitle(focus(1), 2)).toBe("Round 1 of 2 · until your break");
    expect(subtitle(focus(2), 2)).toBe("Round 2 of 2 · until the end");
    expect(subtitle({ phase: "break", round: 1, remainingMs: 1, focusProgress: 0.5 }, 2)).toBe("Break · back in a moment");
    expect(subtitle({ phase: "done", round: 2, remainingMs: 0, focusProgress: 1 }, 2)).toBe("See you next time");
  });
});

describe("caption", () => {
  it("covers every state", () => {
    expect(caption(base)).toEqual({ lead: "Everyone's focusing.", rest: "Walls pulled up." });
    expect(caption({ ...base, meAway: true })).toEqual({ lead: "You've stepped away.", rest: "The wheel slows down." });
    expect(caption({ ...base, dozing: ["Maya"] })).toEqual({ lead: "Maya has nodded off.", rest: "The wheel slows down." });
    expect(caption({ ...base, dozing: ["Leo", "Maya"] })).toEqual({ lead: "Leo & Maya have nodded off.", rest: "The wheel slows down." });
    expect(caption({ ...base, phase: "break", meAway: true })).toEqual({ lead: "Break.", rest: "The wheel rests, and tea is steeping." });
    expect(caption({ ...base, phase: "done" })).toEqual({ lead: "Finishing up.", rest: "The pot comes off the wheel." });
    expect(caption({ ...base, phase: "done", outcome: "kept" })).toEqual({ lead: "Session complete.", rest: "Your pot is finished." });
    expect(caption({ ...base, phase: "done", outcome: "lost" })).toEqual({ lead: "Session ended.", rest: "The clay goes back in the bag." });
  });
});

describe("peekTitle", () => {
  const p = { phase: "focus" as const, focusing: 1, dozing: [], meAway: false, outcome: "pending" as const };
  it("covers every state", () => {
    expect(peekTitle(p)).toBe("1 focusing");
    expect(peekTitle({ ...p, focusing: 0, meAway: true })).toBe("Stepped away");
    expect(peekTitle({ ...p, focusing: 3, dozing: ["Maya"] })).toBe("3 focusing · Maya dozing");
    expect(peekTitle({ ...p, phase: "break" })).toBe("On a break together");
    expect(peekTitle({ ...p, phase: "done", outcome: "kept" })).toBe("Session complete");
    expect(peekTitle({ ...p, phase: "done", outcome: "lost" })).toBe("Session ended");
  });
});

it("has Ashna's eight stage names", () => {
  expect(STAGE_NAMES).toHaveLength(8);
  expect(STAGE_NAMES[0]).toBe("Centring the clay");
});

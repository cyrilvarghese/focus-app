import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, isValidPreset, MIN_MS, sessionTotalMs } from "./preset";

describe("isValidPreset", () => {
  it("accepts every allowed combination's edges", () => {
    expect(isValidPreset({ focusMin: 15, breakMin: 5, rounds: 1 })).toBe(true);
    expect(isValidPreset({ focusMin: 45, breakMin: 15, rounds: 4 })).toBe(true);
    expect(isValidPreset(DEFAULT_PRESET)).toBe(true);
  });

  it("rejects values outside the options", () => {
    expect(isValidPreset({ focusMin: 40, breakMin: 5, rounds: 2 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 7, rounds: 2 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5, rounds: 5 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5, rounds: 0 })).toBe(false);
  });

  it("rejects non-objects and missing fields", () => {
    expect(isValidPreset(null)).toBe(false);
    expect(isValidPreset("25/5x2")).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5 })).toBe(false);
  });
});

describe("sessionTotalMs", () => {
  it("has no break after the last round", () => {
    expect(sessionTotalMs(DEFAULT_PRESET)).toBe(55 * MIN_MS);
  });

  it("is just the focus time for one round", () => {
    expect(sessionTotalMs({ focusMin: 15, breakMin: 10, rounds: 1 })).toBe(15 * MIN_MS);
  });

  it("handles the longest preset", () => {
    expect(sessionTotalMs({ focusMin: 45, breakMin: 15, rounds: 4 })).toBe(225 * MIN_MS);
  });
});

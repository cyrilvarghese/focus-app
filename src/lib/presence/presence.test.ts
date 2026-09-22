import { describe, expect, it } from "vitest";
import { HIDDEN_GRACE_MS, isFocusing } from "./index";

const T = 1_000_000;

describe("isFocusing", () => {
  it("is away whenever offline", () => {
    expect(isFocusing({ touch: false, online: false, hiddenSinceMs: null }, T)).toBe(false);
  });
  it("is focusing while visible", () => {
    expect(isFocusing({ touch: true, online: true, hiddenSinceMs: null }, T)).toBe(true);
  });
  it("gives touch devices a grace period when hidden", () => {
    const hidden = { touch: true, online: true, hiddenSinceMs: T };
    expect(isFocusing(hidden, T + HIDDEN_GRACE_MS - 1)).toBe(true);
    expect(isFocusing(hidden, T + HIDDEN_GRACE_MS)).toBe(false);
  });
  it("never counts a hidden desktop tab as away", () => {
    expect(isFocusing({ touch: false, online: true, hiddenSinceMs: T }, T + 10 * HIDDEN_GRACE_MS)).toBe(true);
  });
});

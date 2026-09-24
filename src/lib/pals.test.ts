import { describe, expect, it } from "vitest";
import {
  isPal,
  LIMITS,
  PALS,
  validateDisplayName,
  validateFocusText,
  validatePodName,
} from "./pals";

describe("pals", () => {
  it("has the four pals in seat order", () => {
    expect(PALS).toEqual(["bunny", "cat", "dog", "koala"]);
  });
  it("isPal accepts pals and rejects everything else", () => {
    expect(isPal("koala")).toBe(true);
    expect(isPal("fox")).toBe(false);
    expect(isPal(undefined)).toBe(false);
  });
});

describe("validatePodName", () => {
  it("rejects empty and whitespace-only", () => {
    expect(validatePodName("")).toBe("Give your pod a name");
    expect(validatePodName("   ")).toBe("Give your pod a name");
  });
  it("accepts up to the limit after trimming", () => {
    expect(validatePodName(" " + "a".repeat(LIMITS.podName) + " ")).toBeNull();
  });
  it("rejects one over the limit", () => {
    expect(validatePodName("a".repeat(LIMITS.podName + 1))).toBe("Keep it under 40 characters");
  });
});

describe("validateDisplayName", () => {
  it("rejects empty and whitespace-only", () => {
    expect(validateDisplayName("")).toBe("What should your pals call you?");
    expect(validateDisplayName("\t")).toBe("What should your pals call you?");
  });
  it("accepts up to the limit and rejects one over", () => {
    expect(validateDisplayName("a".repeat(LIMITS.displayName))).toBeNull();
    expect(validateDisplayName("a".repeat(LIMITS.displayName + 1))).toBe("Keep it under 24 characters");
  });
});

describe("validateFocusText", () => {
  it("allows empty", () => {
    expect(validateFocusText("")).toBeNull();
    expect(validateFocusText("   ")).toBeNull();
  });
  it("accepts up to the limit and rejects one over", () => {
    expect(validateFocusText("a".repeat(LIMITS.focusText))).toBeNull();
    expect(validateFocusText("a".repeat(LIMITS.focusText + 1))).toBe("Keep it under 80 characters");
  });
});

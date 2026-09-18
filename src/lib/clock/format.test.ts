import { describe, expect, it } from "vitest";
import { formatCountdown, formatTogether } from "./format";

describe("formatTogether", () => {
  it("uses minutes under an hour", () => {
    expect(formatTogether(55)).toBe("55 minutes");
    expect(formatTogether(1)).toBe("1 minute");
  });

  it("uses hours with no trailing minutes on the hour", () => {
    expect(formatTogether(60)).toBe("1h");
    expect(formatTogether(120)).toBe("2h");
  });

  it("uses hours and minutes otherwise", () => {
    expect(formatTogether(95)).toBe("1h 35m");
    expect(formatTogether(225)).toBe("3h 45m");
  });
});

describe("formatCountdown", () => {
  it("formats whole minutes", () => {
    expect(formatCountdown(25 * 60_000)).toBe("25:00");
  });

  it("rounds up so it never shows 00:00 while time remains", () => {
    expect(formatCountdown(1)).toBe("00:01");
    expect(formatCountdown(59_001)).toBe("01:00");
  });

  it("shows 00:00 at or below zero", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

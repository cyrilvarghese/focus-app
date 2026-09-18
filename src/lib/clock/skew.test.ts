import { describe, expect, it } from "vitest";
import { clockOffset } from "./skew";

describe("clockOffset", () => {
  it("is zero when clocks agree", () => {
    expect(clockOffset(1000, 1050, 1100)).toBe(0);
  });

  it("is positive when the server is ahead", () => {
    // round trip 200 ms, so the server stamped at client time 1100; server said 6100
    expect(clockOffset(1000, 6100, 1200)).toBe(5000);
  });

  it("is negative when the server is behind", () => {
    expect(clockOffset(1000, -1900, 1200)).toBe(-3000);
  });
});

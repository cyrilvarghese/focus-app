import { describe, expect, it } from "vitest";
import { monthGrid, stepMonth, ymd } from "./calendar";

describe("ymd", () => {
  it("formats a local date", () => {
    expect(ymd(new Date(2026, 8, 24, 13, 30).getTime())).toBe("2026-09-24");
    expect(ymd(new Date(2026, 0, 1).getTime())).toBe("2026-01-01");
  });
});

describe("monthGrid", () => {
  it("starts each week on a Monday and covers the month", () => {
    const weeks = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(weeks[0].map((d) => d.date)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][1].inMonth).toBe(true);
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("handles a month starting on a Monday", () => {
    const weeks = monthGrid(2026, 5); // June 2026 starts on a Monday
    expect(weeks[0][0].date).toBe("2026-06-01");
    expect(weeks[0][0].inMonth).toBe(true);
  });

  it("handles February in a leap year", () => {
    expect(monthGrid(2028, 1).flat().filter((d) => d.inMonth)).toHaveLength(29);
    expect(monthGrid(2026, 1).flat().filter((d) => d.inMonth)).toHaveLength(28);
  });
});

describe("stepMonth", () => {
  it("steps within and across years", () => {
    expect(stepMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 });
    expect(stepMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(stepMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

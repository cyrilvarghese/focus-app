export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Weeks start on Monday. */
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export type Day = {
  /** Local calendar date, "2026-09-24". */
  date: string;
  day: number;
  inMonth: boolean;
};

/** "2026-09-24" for a moment in local time, which is how a person means "the day I focused". */
export function ymd(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole weeks (Monday first) covering the month, with the neighbouring days that fill them out. */
export function monthGrid(year: number, month: number): Day[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  // getDay(): 0 is Sunday, so Monday-first means shifting by six.
  start.setDate(1 - ((first.getDay() + 6) % 7));

  const weeks: Day[][] = [];
  const cursor = new Date(start);
  while (weeks.length < 6) {
    const week: Day[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: ymd(cursor.getTime()), day: cursor.getDate(), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && weeks.length >= 4) break;
  }
  return weeks;
}

/** Steps a year and month by whole months, keeping the month in 0..11. */
export function stepMonth(year: number, month: number, by: number): { year: number; month: number } {
  const total = year * 12 + month + by;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

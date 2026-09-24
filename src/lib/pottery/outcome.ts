import { focusWindows, MIN_MS, type Session } from "@/lib/clock";

/** A stretch of time one member was focusing. endMs is null while still open. */
export type FocusInterval = { userId: string; startMs: number; endMs: number | null };

/**
 * One per focusing member per minute of focus time: the summary's "189 pal-minutes".
 * The same user's overlapping intervals (two tabs) count once, and break time never counts.
 */
export function palMinutes(intervals: FocusInterval[], session: Session, nowMs: number): number {
  const byUser = new Map<string, [number, number][]>();
  for (const { userId, startMs, endMs } of intervals) {
    const end = endMs ?? nowMs;
    if (end <= startMs) continue;
    const spans = byUser.get(userId) ?? [];
    spans.push([startMs, end]);
    byUser.set(userId, spans);
  }

  const windows = focusWindows(session);
  let totalMs = 0;
  for (const spans of byUser.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of spans) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    }
    for (const [s, e] of merged) {
      for (const w of windows) totalMs += Math.max(0, Math.min(e, w.endMs) - Math.max(s, w.startMs));
    }
  }
  // Session time, so a fast-mode session still reports the minutes it represents.
  return Math.floor((totalMs * (session.speed ?? 1)) / MIN_MS);
}

/** The pot survives if anyone is still at the table at the end, and it goes to them. */
export function potOutcome(presentAtEnd: string[]): { kept: boolean; recipients: string[] } {
  const recipients = [...new Set(presentAtEnd)];
  return { kept: recipients.length > 0, recipients };
}

import { MIN_MS, sessionTotalMs, type Preset } from "./preset";

export type Session = { id: string; startedAtMs: number; preset: Preset };
export type Phase = "focus" | "break" | "done";
export type ClockState = {
  phase: Phase;
  /** 1-based. During a break, the round that just finished. */
  round: number;
  /** Time left in the current phase. */
  remainingMs: number;
  /** Focused time so far ÷ total focus time, 0..1. Breaks don't count. */
  focusProgress: number;
};
export type FocusWindow = { round: number; startMs: number; endMs: number };

export function focusWindows(s: Session): FocusWindow[] {
  const focusMs = s.preset.focusMin * MIN_MS;
  const cycleMs = focusMs + s.preset.breakMin * MIN_MS;
  return Array.from({ length: s.preset.rounds }, (_, i) => {
    const startMs = s.startedAtMs + i * cycleMs;
    return { round: i + 1, startMs, endMs: startMs + focusMs };
  });
}

/** The timer is data: every client derives the same state from the session and the server's now. */
export function phaseAt(s: Session, nowMs: number): ClockState {
  const { focusMin, breakMin, rounds } = s.preset;
  const elapsed = Math.max(0, nowMs - s.startedAtMs);
  if (elapsed >= sessionTotalMs(s.preset)) {
    return { phase: "done", round: rounds, remainingMs: 0, focusProgress: 1 };
  }

  const focusMs = focusMin * MIN_MS;
  const cycleMs = focusMs + breakMin * MIN_MS;
  const totalFocusMs = focusMs * rounds;
  const i = Math.floor(elapsed / cycleMs);
  const intoCycle = elapsed - i * cycleMs;

  if (intoCycle < focusMs) {
    return {
      phase: "focus",
      round: i + 1,
      remainingMs: focusMs - intoCycle,
      focusProgress: (i * focusMs + intoCycle) / totalFocusMs,
    };
  }
  return {
    phase: "break",
    round: i + 1,
    remainingMs: cycleMs - intoCycle,
    focusProgress: ((i + 1) * focusMs) / totalFocusMs,
  };
}

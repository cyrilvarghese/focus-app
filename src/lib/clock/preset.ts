export const MIN_MS = 60_000;

export const FOCUS_OPTIONS = [15, 25, 45] as const;
export const BREAK_OPTIONS = [5, 10, 15] as const;
export const ROUND_OPTIONS = [1, 2, 3, 4] as const;

export type Preset = {
  focusMin: (typeof FOCUS_OPTIONS)[number];
  breakMin: (typeof BREAK_OPTIONS)[number];
  rounds: (typeof ROUND_OPTIONS)[number];
};

export const DEFAULT_PRESET: Preset = { focusMin: 25, breakMin: 5, rounds: 2 };

const oneOf = (options: readonly number[], v: unknown) =>
  typeof v === "number" && options.includes(v);

export function isValidPreset(p: unknown): p is Preset {
  if (typeof p !== "object" || p === null) return false;
  const { focusMin, breakMin, rounds } = p as Record<string, unknown>;
  return (
    oneOf(FOCUS_OPTIONS, focusMin) &&
    oneOf(BREAK_OPTIONS, breakMin) &&
    oneOf(ROUND_OPTIONS, rounds)
  );
}

/** Focus for every round, with a break between rounds but not after the last. */
export function sessionTotalMs(p: Preset): number {
  return (p.focusMin * p.rounds + p.breakMin * (p.rounds - 1)) * MIN_MS;
}

import { phaseAt, type Session } from "@/lib/clock";
import { type Recipe, recipeFor } from "./recipe";

export type PotStatus = "idle" | "throwing" | "complete" | "abandoned";

/** Everything the pottery wheel component (built by Ashna) receives. */
export type PotteryView = {
  /** This session's pot: shape, glaze and its small variations. */
  recipe: Recipe;
  /** 0..1, the clock's focusProgress. Holds steady during breaks. */
  progress: number;
  /** True only during focus; the wheel spins down on breaks. */
  running: boolean;
  /** 0..1, the share of members focusing. The wheel slows when pals doze. */
  pace: number;
  /** complete: glaze and reveal. abandoned: collapse. idle: no session yet (never returned here). */
  status: PotStatus;
};

export function potteryView(
  session: Session,
  nowMs: number,
  { presentCount, memberCount, left = false }: { presentCount: number; memberCount: number; left?: boolean },
): PotteryView {
  const clock = phaseAt(session, nowMs);
  let status: PotStatus = "throwing";
  if (left) status = "abandoned";
  else if (clock.phase === "done") status = presentCount >= 1 ? "complete" : "abandoned";

  return {
    recipe: recipeFor(session.id),
    progress: clock.focusProgress,
    running: !left && clock.phase === "focus",
    pace: Math.min(1, Math.max(0, presentCount / Math.max(1, memberCount))),
    status,
  };
}

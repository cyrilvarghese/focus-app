import { phaseAt, type Session } from "@/lib/clock";
import { type Glaze, pieceById, pieceFor, type PieceId } from "./piece";

export type PotStatus = "idle" | "throwing" | "complete" | "abandoned";

/** Everything the pottery wheel component (built by Ashna) receives. */
export type PotteryView = {
  /** What the throw is heading toward: the animation's id and its name. */
  pieceId: PieceId;
  pieceName: string;
  glaze: Glaze;
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

  const piece = pieceFor(session.id);
  return {
    ...piece,
    pieceName: pieceById(piece.pieceId).name,
    progress: clock.focusProgress,
    running: !left && clock.phase === "focus",
    pace: Math.min(1, Math.max(0, presentCount / Math.max(1, memberCount))),
    status,
  };
}

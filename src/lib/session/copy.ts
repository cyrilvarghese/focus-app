import type { ClockState, Phase } from "@/lib/clock";

/** One per pot stage in public/studio-pot.js, as public/studio.html names them. */
export const STAGE_NAMES = [
  "Centring the clay",
  "Walls pulled up",
  "Easing out the belly",
  "Rounding the shoulder",
  "Drawing in the neck",
  "Narrowing the neck",
  "Flaring the lip",
  "Rolling the lip",
] as const;

/** pending: the timer is up but the server hasn't recorded the result yet. */
export type Outcome = "pending" | "kept" | "lost";

export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export function subtitle(c: ClockState, rounds: number): string {
  if (c.phase === "break") return "Break · back in a moment";
  if (c.phase === "done") return "See you next time";
  return `Round ${c.round} of ${rounds} · ${c.round < rounds ? "until your break" : "until the end"}`;
}

export function caption(o: {
  phase: Phase;
  stage: string;
  meAway: boolean;
  dozing: string[];
  outcome: Outcome;
}): { lead: string; rest: string } {
  if (o.phase === "done") {
    if (o.outcome === "kept") return { lead: "Session complete.", rest: "Your pot is finished." };
    if (o.outcome === "lost") return { lead: "Session ended.", rest: "The clay goes back in the bag." };
    return { lead: "Finishing up.", rest: "The pot comes off the wheel." };
  }
  if (o.phase === "break") return { lead: "Break.", rest: "The wheel rests, and tea is steeping." };
  if (o.meAway) return { lead: "You've stepped away.", rest: "The wheel slows down." };
  if (o.dozing.length) {
    return { lead: `${listNames(o.dozing)} ${o.dozing.length > 1 ? "have" : "has"} nodded off.`, rest: "The wheel slows down." };
  }
  return { lead: "Everyone's focusing.", rest: `${o.stage}.` };
}

export function peekTitle(o: { phase: Phase; focusing: number; dozing: string[]; meAway: boolean; outcome: Outcome }): string {
  if (o.phase === "done") return o.outcome === "lost" ? "Session ended" : "Session complete";
  if (o.phase === "break") return "On a break together";
  if (o.meAway && o.focusing === 0) return "Stepped away";
  const base = `${o.focusing} focusing`;
  return o.dozing.length ? `${base} · ${listNames(o.dozing)} dozing` : base;
}

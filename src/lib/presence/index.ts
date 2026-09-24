/** PRD §8: how long a phone can be hidden (a glance at a notification) before its pal dozes. */
export const HIDDEN_GRACE_MS = 15_000;

export type PresenceInput = {
  /** A touch-first device (phone, tablet). */
  touch: boolean;
  online: boolean;
  /** When the page was last hidden, or null while visible. */
  hiddenSinceMs: number | null;
};

/** On a desktop a background tab is fine (you're working in another window); only a closed tab or lost connection counts. */
export function isFocusing(i: PresenceInput, nowMs: number): boolean {
  if (!i.online) return false;
  if (i.hiddenSinceMs === null || !i.touch) return true;
  return nowMs - i.hiddenSinceMs < HIDDEN_GRACE_MS;
}

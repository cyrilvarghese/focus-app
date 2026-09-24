/** What each open screen reports about its person, through Realtime presence. */
export type PresenceStatus = "lobby" | "focusing" | "break" | "away";

export type WhoIsHere = {
  /** User ids at the table and focusing (or on the break with everyone), you included when you are. */
  focusing: string[];
  /** User ids who stepped away or closed the app. Never includes you: your own state is local. */
  dozing: string[];
};

/**
 * Who's here during a session. Someone missing from presence has closed the app, so they doze too.
 * Until the first presence sync arrives, everyone is assumed present, so the screen doesn't flash
 * "3 dozing" for a second on load.
 */
export function whoIsHere(
  memberIds: string[],
  states: Record<string, PresenceStatus>,
  me: string,
  meFocusing: boolean,
  synced: boolean,
): WhoIsHere {
  const focusing: string[] = [];
  const dozing: string[] = [];
  for (const id of memberIds) {
    if (id === me) {
      if (meFocusing) focusing.push(id);
      continue;
    }
    const s = states[id];
    if (!synced || s === "focusing" || s === "break") focusing.push(id);
    else dozing.push(id);
  }
  return { focusing, dozing };
}

/** 0..1, the share of the table that's focusing. The wheel slows as it drops. */
export function paceOf(who: WhoIsHere, memberCount: number): number {
  return memberCount > 0 ? who.focusing.length / memberCount : 0;
}

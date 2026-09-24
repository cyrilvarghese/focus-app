import type { SupabaseClient } from "@supabase/supabase-js";
import type { PresenceStatus } from "../session/who";

export type PresenceStates = Record<string, PresenceStatus>;

const STATUSES: readonly PresenceStatus[] = ["lobby", "focusing", "break", "away"];

/**
 * Supabase keeps a list of payloads per key (one per open tab). The same person in two tabs
 * counts once: focusing if any tab is focusing, otherwise the most present state.
 */
export function flattenPresence(raw: Record<string, { status?: unknown }[]>): PresenceStates {
  const rank: Record<PresenceStatus, number> = { focusing: 3, break: 2, lobby: 1, away: 0 };
  const out: PresenceStates = {};
  for (const [userId, metas] of Object.entries(raw)) {
    let best: PresenceStatus | null = null;
    for (const m of metas ?? []) {
      const s = m?.status;
      if (typeof s !== "string" || !(STATUSES as readonly string[]).includes(s)) continue;
      const status = s as PresenceStatus;
      if (best === null || rank[status] > rank[best]) best = status;
    }
    if (best) out[userId] = best;
  }
  return out;
}

export type PresenceHandle = {
  /** Tells everyone your new state. Safe to call before the channel has connected. */
  update(status: PresenceStatus): void;
  leave(): void;
};

/**
 * Joins the pod's presence channel as you. onSync gets everyone's state whenever it changes,
 * including when someone closes the app (they drop out of the list).
 */
export function joinPresence(
  client: SupabaseClient,
  podId: string,
  userId: string,
  initial: PresenceStatus,
  onSync: (states: PresenceStates) => void,
): PresenceHandle {
  let status = initial;
  let joined = false;
  const channel = client.channel(`presence:${podId}`, { config: { presence: { key: userId } } });

  channel
    .on("presence", { event: "sync" }, () => {
      onSync(flattenPresence(channel.presenceState() as Record<string, { status?: unknown }[]>));
    })
    .subscribe((state) => {
      if (state === "SUBSCRIBED") {
        joined = true;
        void channel.track({ status });
      }
    });

  return {
    update(next) {
      if (next === status) return;
      status = next;
      if (joined) void channel.track({ status });
    },
    leave() {
      void channel.untrack();
      client.removeChannel(channel);
    },
  };
}

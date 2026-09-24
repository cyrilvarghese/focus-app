import type { SupabaseClient } from "@supabase/supabase-js";
import { type Session } from "../clock";
import { type FocusInterval, palMinutes, pieceFor } from "../pottery";
import type { Glaze, PieceKind } from "../pottery/piece";
import { toClockSession, type SessionRow } from "./sessions";

/** One finished pot on your shelf. */
export type ShelfItem = {
  sessionId: string;
  podName: string;
  /** When the session ended, in ms. */
  endedAtMs: number;
  kind: PieceKind;
  glaze: Glaze;
  /** Your own focused minutes in that session. */
  minutes: number;
};

type ShelfRow = {
  present_at_end: boolean | null;
  sessions: (SessionRow & { pods: { name: string } | null }) | null;
};

const SHELF_COLUMNS =
  "present_at_end, sessions!inner(id, pod_id, started_by, focus_min, break_min, rounds, speed, started_at, ended_at, pods(name))";

/** Groups a user's intervals by session. */
function intervalsBySession(rows: { session_id: string; user_id: string; started_at: string; ended_at: string | null }[]) {
  const by = new Map<string, FocusInterval[]>();
  for (const r of rows) {
    const list = by.get(r.session_id) ?? [];
    list.push({ userId: r.user_id, startMs: Date.parse(r.started_at), endMs: r.ended_at ? Date.parse(r.ended_at) : null });
    by.set(r.session_id, list);
  }
  return by;
}

/**
 * The sessions you were at the table for, newest first, with the pot each one made.
 * Two reads: the finished sessions, then your focus intervals for them.
 */
export async function getMyShelf(client: SupabaseClient, userId: string): Promise<ShelfItem[]> {
  const { data, error } = await client
    .from("session_members")
    .select(SHELF_COLUMNS)
    .eq("user_id", userId)
    .eq("present_at_end", true)
    .limit(200);
  if (error || !data) return [];

  const sessions = (data as unknown as ShelfRow[])
    .map((r) => r.sessions)
    .filter((s): s is SessionRow & { pods: { name: string } | null } => Boolean(s?.ended_at))
    .sort((a, b) => Date.parse(b.ended_at ?? "") - Date.parse(a.ended_at ?? ""));
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: ivRows } = await client
    .from("focus_intervals")
    .select("session_id, user_id, started_at, ended_at")
    .eq("user_id", userId)
    .in("session_id", ids);
  const bySession = intervalsBySession(
    (ivRows ?? []) as { session_id: string; user_id: string; started_at: string; ended_at: string | null }[],
  );

  return sessions.map((s) => {
    const clockSession = toClockSession(s);
    const intervals = bySession.get(s.id) ?? [];
    return {
      sessionId: s.id,
      podName: s.pods?.name ?? "Your pod",
      endedAtMs: Date.parse(s.ended_at ?? ""),
      ...pieceFor(s.id),
      minutes: palMinutes(intervals, clockSession, Date.parse(s.ended_at ?? "")),
    };
  });
}

/** Everyone's focused minutes in one session, for the reveal. */
export async function getSessionMinutes(
  client: SupabaseClient,
  sessionId: string,
  session: Session,
  endedAtMs: number,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("focus_intervals")
    .select("session_id, user_id, started_at, ended_at")
    .eq("session_id", sessionId);
  if (error || !data) return {};

  const rows = data as { session_id: string; user_id: string; started_at: string; ended_at: string | null }[];
  const byUser = new Map<string, FocusInterval[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push({ userId: r.user_id, startMs: Date.parse(r.started_at), endMs: r.ended_at ? Date.parse(r.ended_at) : null });
    byUser.set(r.user_id, list);
  }

  const out: Record<string, number> = {};
  for (const [userId, intervals] of byUser) out[userId] = palMinutes(intervals, session, endedAtMs);
  return out;
}

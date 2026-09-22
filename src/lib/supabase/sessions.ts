import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "../clock";

/** A row of public.sessions (supabase/migrations/0002_sessions.sql). */
export type SessionRow = {
  id: string;
  pod_id: string;
  started_by: string;
  focus_min: 15 | 25 | 45;
  break_min: 5 | 10 | 15;
  rounds: 1 | 2 | 3 | 4;
  /** 1, or 60 in dev fast mode. */
  speed: number;
  started_at: string;
  ended_at: string | null;
};

export function toClockSession(r: SessionRow): Session {
  return {
    id: r.id,
    startedAtMs: Date.parse(r.started_at),
    preset: { focusMin: r.focus_min, breakMin: r.break_min, rounds: r.rounds },
    speed: r.speed,
  };
}

const SESSION_ERRORS = [
  "not_signed_in",
  "not_host",
  "invalid_speed",
  "fast_sessions_off",
  "session_running",
  "not_in_session",
  "not_over",
  "network",
] as const;
export type SessionError = (typeof SESSION_ERRORS)[number];

type Failure = { error: SessionError };

/** The functions raise short codes as the error message; anything else is treated as a network problem. */
const failure = (e: { message: string } | null): Failure => ({
  error: e && (SESSION_ERRORS as readonly string[]).includes(e.message) ? (e.message as SessionError) : "network",
});

async function rpc(client: SupabaseClient, fn: string, args: Record<string, unknown>) {
  try {
    return await client.rpc(fn, args);
  } catch {
    return { data: null, error: { message: "network" } };
  }
}

const COLUMNS = "id, pod_id, started_by, focus_min, break_min, rounds, speed, started_at, ended_at";

export async function getOpenSession(client: SupabaseClient, podId: string): Promise<SessionRow | null> {
  const { data, error } = await client.from("sessions").select(COLUMNS).eq("pod_id", podId).is("ended_at", null).maybeSingle();
  if (error || !data) return null;
  return data as SessionRow;
}

export async function startSession(client: SupabaseClient, podId: string, speed = 1): Promise<{ session: SessionRow } | Failure> {
  const { data, error } = await rpc(client, "start_session", { p_pod_id: podId, p_speed: speed });
  if (error) return failure(error);
  if (!data || typeof data !== "object") return failure(null);
  return { session: data as SessionRow };
}

/** Checks in and returns the server's time, for correcting the local clock. */
export async function heartbeat(client: SupabaseClient, sessionId: string): Promise<{ serverMs: number } | Failure> {
  const { data, error } = await rpc(client, "heartbeat", { p_session_id: sessionId });
  if (error) return failure(error);
  const serverMs = typeof data === "string" ? Date.parse(data) : NaN;
  return Number.isFinite(serverMs) ? { serverMs } : failure(null);
}

export async function leaveSession(client: SupabaseClient, sessionId: string): Promise<{ ok: true } | Failure> {
  const { error } = await rpc(client, "leave_session", { p_session_id: sessionId });
  return error ? failure(error) : { ok: true };
}

/** Safe to call more than once. Refused with not_over until the scheduled end. */
export async function finishSession(client: SupabaseClient, sessionId: string): Promise<{ ok: true } | Failure> {
  const { error } = await rpc(client, "finish_session", { p_session_id: sessionId });
  return error ? failure(error) : { ok: true };
}

/** Whether you were at the table at the end (and so get the pot). Null until the session has closed. */
export async function getMyResult(client: SupabaseClient, sessionId: string, userId: string): Promise<boolean | null> {
  const { data, error } = await client
    .from("session_members")
    .select("present_at_end")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { present_at_end: boolean | null }).present_at_end;
}

export function sessionErrorMessage(code: SessionError): string {
  switch (code) {
    case "not_signed_in":
      return "You're not signed in yet. Try again in a moment.";
    case "not_host":
      return "Only the organizer can start the session.";
    case "invalid_speed":
    case "fast_sessions_off":
      return "Fast mode is switched off for this project.";
    case "session_running":
      return "A session is already running in this pod.";
    case "not_in_session":
      return "You're not part of this session.";
    case "not_over":
      return "The session isn't over yet.";
    case "network":
      return "Can't reach Focuspal right now.";
  }
}

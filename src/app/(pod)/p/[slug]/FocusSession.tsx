"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PalFace } from "@/components/pals/PalFace";
import { type SceneView, StudioScene } from "@/components/scene/StudioScene";
import { clockOffset, formatCountdown, phaseAt } from "@/lib/clock";
import { isFocusing } from "@/lib/presence";
import { potteryView } from "@/lib/pottery";
import { caption, type Outcome, peekTitle, STAGE_NAMES, subtitle } from "@/lib/session/copy";
import { getSupabase } from "@/lib/supabase/client";
import { finishSession, getMyResult, heartbeat, leaveSession, type SessionRow, toClockSession } from "@/lib/supabase/sessions";
import type { Pod, PodMember } from "@/lib/supabase/types";
import { PrimaryButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";

const TICK_MS = 250;
const BEAT_MS = 15_000;
const FINISH_RETRY_MS = 2_000;

/** Wall-clock time, ticking. 0 until the first tick, so nothing time-dependent renders on the first paint. */
function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

/** The inputs to isFocusing, kept current from the browser. Only rendered on the client. */
function usePresenceInput() {
  const [touch, setTouch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [online, setOnline] = useState(() => navigator.onLine);
  // Opened while hidden: treat it as hidden since the start.
  const [hiddenSinceMs, setHiddenSinceMs] = useState<number | null>(() => (document.hidden ? 0 : null));

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onPointer = () => setTouch(mq.matches);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onVisibility = () => setHiddenSinceMs(document.hidden ? Date.now() : null);
    mq.addEventListener("change", onPointer);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mq.removeEventListener("change", onPointer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { touch, online, hiddenSinceMs };
}

/** Keeps the screen on while the session runs and the page is visible. Silently does nothing where unsupported. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (live) lock = l;
        else l.release().catch(() => {});
      } catch {
        // Denied (battery saver, permissions): the session still works.
      }
    };
    request();
    const onVisibility = () => void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

const inviteIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0" />
    <path d="M19 8v6M16 11h6" />
  </svg>
);

const chevron = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export function FocusSession({ pod, members, me, session }: { pod: Pod; members: PodMember[]; me: string; session: SessionRow }) {
  const router = useRouter();
  const now = useNow();
  const presence = usePresenceInput();
  const [offset, setOffset] = useState(0);
  const [stage, setStage] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>("pending");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const clockSession = useMemo(() => toClockSession(session), [session]);
  const t = now + offset;
  const clock = phaseAt(clockSession, t);
  const ended = now > 0 && clock.phase === "done";
  const focusing = isFocusing(presence, now);
  const meAway = !focusing && clock.phase === "focus";

  // Check in while focusing. Each check-in also corrects the clock to the server's.
  useEffect(() => {
    if (!focusing || ended) return;
    let live = true;
    const beat = async () => {
      const sent = Date.now();
      const r = await heartbeat(getSupabase(), session.id);
      if (live && "serverMs" in r) setOffset(clockOffset(sent, r.serverMs, Date.now()));
    };
    beat();
    const id = setInterval(beat, BEAT_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [focusing, ended, session.id]);

  // When the time is up: close the session on the server, then read whether you get the pot.
  useEffect(() => {
    if (!ended) return;
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      const client = getSupabase();
      const r = await finishSession(client, session.id);
      if (!live) return;
      if ("error" in r) {
        retry = setTimeout(attempt, FINISH_RETRY_MS);
        return;
      }
      const kept = await getMyResult(client, session.id, me);
      if (live) setOutcome(kept ? "kept" : "lost");
    };
    attempt();
    return () => {
      live = false;
      clearTimeout(retry);
    };
  }, [ended, session.id, me]);

  useWakeLock(!ended);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const onStage = useCallback((i: number) => setStage(i), []);

  if (now === 0) {
    return (
      <Screen>
        <Grow />
        <p className="text-center text-[15px] text-muted">One moment…</p>
        <Grow />
      </Screen>
    );
  }

  // Until friends can join (piece 2), only your own presence is known here.
  const pv = potteryView(clockSession, t, { presentCount: focusing ? 1 : 0, memberCount: 1 });
  const view: SceneView = {
    progress: pv.progress,
    running: pv.running && !ended,
    pace: pv.pace,
    status: outcome === "kept" ? "complete" : outcome === "lost" ? "abandoned" : "throwing",
  };
  const cap = caption({ phase: clock.phase, stage: STAGE_NAMES[stage], meAway, dozing: [], outcome });
  const peek = peekTitle({ phase: clock.phase, focusing: focusing ? 1 : 0, dozing: [], meAway, outcome });

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${pod.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard here; the lobby shows the link as text.
    }
  }

  async function leave() {
    setLeaving(true);
    await leaveSession(getSupabase(), session.id);
    router.push("/");
  }

  const status = (m: PodMember) => {
    if (m.user_id !== me) return "At the table";
    if (clock.phase === "break") return "On break";
    return focusing ? "Focusing" : "Stepped away";
  };

  return (
    <Screen
      nav={
        <>
          <span className="text-sm text-text-2">{pod.name}</span>
          <button
            type="button"
            aria-label="Invite a friend"
            onClick={() => setSheetOpen(true)}
            className="-mr-2.5 grid h-11 w-11 place-items-center rounded-full text-text-2"
          >
            {inviteIcon}
          </button>
        </>
      }
    >
      <div className="text-center">
        <p role="timer" className="display text-[76px] font-normal leading-[.95] tracking-[-1px] tabular-nums">
          {formatCountdown(clock.remainingMs)}
        </p>
        <p className="display mt-2 text-[15.5px] text-sage">{subtitle(clock, session.rounds)}</p>
      </div>

      <StudioScene label="A terracotta pot being thrown on a wheel in a quiet pottery studio" view={view} onStage={onStage} />

      <p className="mx-1 mt-1 min-h-5 text-center text-[13.5px] text-text-2" aria-live="polite">
        <b className="font-semibold text-text">{cap.lead}</b> {cap.rest}
      </p>

      <Grow />

      {ended && outcome !== "pending" ? (
        <div className="mt-4">
          <PrimaryButton onClick={() => router.push("/")}>Done</PrimaryButton>
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
          className="mt-4 flex min-h-[64px] w-full items-center gap-3 rounded-3xl bg-card px-5 text-left shadow-[0_-10px_30px_-18px_rgba(61,57,52,.3)]"
        >
          <span className="flex">
            {members.map((m, i) => (
              <span key={m.user_id} className={`rounded-full shadow-[0_0_0_2px_var(--card)] ${i ? "-ml-2" : ""}`}>
                <PalFace pal={m.animal} size={32} dimmed={m.user_id === me && !focusing} />
              </span>
            ))}
          </span>
          <span className="flex-1 text-[15px] font-medium text-text-2">{peek}</span>
          <span className="text-muted">{chevron}</span>
        </button>
      )}

      {sheetOpen ? (
        <div className="fixed inset-0 z-20" role="dialog" aria-modal="true" aria-label="Who's here">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setSheetOpen(false);
              setConfirmLeave(false);
            }}
            className="absolute inset-0 bg-[rgba(61,57,52,.14)]"
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[420px] rounded-t-[28px] bg-card px-6 pb-8 pt-6 shadow-[0_-10px_30px_-18px_rgba(61,57,52,.3)]">
            <p className="display text-[22px] font-medium">Who&apos;s here</p>
            <ul className="mt-4 grid gap-4">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3">
                  <PalFace pal={m.animal} size={44} dimmed={m.user_id === me && !focusing} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">
                      {m.display_name}
                      {m.user_id === me ? <span className="ml-1.5 text-[12.5px] font-medium text-muted">you</span> : null}
                      {m.user_id === pod.host_id ? <span className="ml-1.5 text-[12.5px] font-medium text-muted">host</span> : null}
                    </span>
                    {m.focus_text ? <span className="block truncate text-[13.5px] text-text-2">{m.focus_text}</span> : null}
                    {m.tags.length ? <span className="block truncate text-[12.5px] text-muted">{m.tags.join(" · ")}</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-text-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${m.user_id === me && !focusing ? "bg-[var(--sleep)]" : "bg-[var(--live)]"}`}
                    />
                    {status(m)}
                  </span>
                </li>
              ))}
            </ul>

            {confirmLeave ? (
              <div className="mt-6">
                <p className="text-center text-[14.5px] text-text-2">
                  Leave the session? You&apos;ll only get the pot if you&apos;re back before the end.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="min-h-12 flex-1 rounded-full border border-line bg-card text-[15px] font-semibold text-text"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    disabled={leaving}
                    onClick={leave}
                    className="min-h-12 flex-1 rounded-full text-[15px] font-semibold text-danger disabled:opacity-50"
                  >
                    {leaving ? "One moment…" : "Leave"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-1">
                <button
                  type="button"
                  onClick={copyInvite}
                  className="min-h-12 rounded-full bg-sage-soft text-[15px] font-semibold text-sage-deep"
                  aria-live="polite"
                >
                  {copied ? "Copied" : "Copy invite link"}
                </button>
                {ended ? null : (
                  <button type="button" onClick={() => setConfirmLeave(true)} className="min-h-12 text-[15px] font-semibold text-danger">
                    Leave
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}

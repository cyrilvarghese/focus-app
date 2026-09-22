# Piece 3: Sessions and the Focus Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The organizer taps Start focusing and the pod link becomes a shared, server-timed focus session with Ashna's studio, breaks, stepping away, and an ending that records who was at the table.

**Architecture:** A new migration adds `sessions`, `session_members` and `focus_intervals`, written only through four security-definer functions. Pure modules (`clock` with a speed factor, `presence`, `session/copy`) decide phase, away-ness and wording; `supabase/sessions.ts` wraps the functions. The Lobby starts the session and swaps to a `FocusSession` client component that ticks the clock, sends heartbeats, holds a wake lock, drives `StudioScene` and finishes the session.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5, Tailwind 4, Vitest 5, supabase-js 2.116

**Spec:** `docs/superpowers/specs/2026-09-22-sessions-focus-screen-design.md`

## Global Constraints

- `src/lib/*` must not import `next/*`, `react` or DOM APIs. `src/lib/supabase` is the only module that touches the network.
- Writes only through `security definer` functions with `search_path = ''`; execute granted to `authenticated` only.
- Fast mode is `speed = 60`, allowed only when `app_settings.dev_fast_sessions = 'on'`.
- At the table at the end = an open interval whose `last_heartbeat_at ≥ end − 90 s`. Heartbeats every 15 s. Hidden grace on touch devices 15 s.
- Copy exactly as in the spec. The timer never changes colour. Tap targets ≥ 44 px.
- Commands run from `C:\Users\cyril varghese\code\focus app\.claude\worktrees\m2-home-start-pod`. Don't push. Commit messages end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Migrations are pasted into the Supabase SQL editor by Cyril; the agent can't apply them.

## File map

| File | Responsibility |
|---|---|
| `src/lib/clock/phase.ts` (+ test) | `speed` on `Session` |
| `src/lib/presence/index.ts` (+ test) | `isFocusing` |
| `src/lib/session/copy.ts` (+ test) | stage names, subtitle, caption, peek title |
| `supabase/migrations/0002_sessions.sql` | tables, RLS, functions |
| `src/lib/supabase/sessions.ts` (+ test) | wrappers |
| `src/components/scene/StudioScene.tsx` | optional `view` + `onStage` |
| `src/app/(pod)/p/[slug]/FocusSession.tsx` | the focus screen |
| `src/app/(pod)/p/[slug]/Lobby.tsx` | start + switch to the focus screen |
| `docs/supabase-setup.md` | applying 0002, fast mode, checklist |

---

### Task 1: Fast mode in the clock

**Files:** Modify `src/lib/clock/phase.ts`; Test `src/lib/clock/phase.test.ts` (append)

**Interfaces:** Produces `Session = { id; startedAtMs; preset; speed?: number }`. `phaseAt` returns session-time `remainingMs`; `focusWindows` returns real-time windows.

- [ ] **Step 1: Append failing tests** to `src/lib/clock/phase.test.ts`

```ts
describe("fast mode (speed)", () => {
  const fast: Session = { id: "f", startedAtMs: S, preset: DEFAULT_PRESET, speed: 60 };

  it("runs a minute of session time per real second", () => {
    expect(phaseAt(fast, S + 25_000)).toEqual({ phase: "break", round: 1, remainingMs: 5 * MIN_MS, focusProgress: 0.5 });
    expect(phaseAt(fast, S + 55_000).phase).toBe("done");
  });

  it("puts focus windows in real time", () => {
    expect(focusWindows(fast)).toEqual([
      { round: 1, startMs: S, endMs: S + 25_000 },
      { round: 2, startMs: S + 30_000, endMs: S + 55_000 },
    ]);
  });

  it("treats a missing speed as 1", () => {
    expect(phaseAt({ ...fast, speed: undefined }, S + 25_000).phase).toBe("focus");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/clock/phase.test.ts` → the 3 new tests FAIL.

- [ ] **Step 3: Implement** in `src/lib/clock/phase.ts`: add `speed?: number` to `Session` with the doc comment `/** Dev fast mode: session time runs this many times faster than real time. Default 1. */`; in `focusWindows` divide `focusMs` and `cycleMs` by `k = s.speed ?? 1` before building windows; in `phaseAt` compute `const elapsed = Math.max(0, (nowMs - s.startedAtMs) * (s.speed ?? 1));`.

```ts
export function focusWindows(s: Session): FocusWindow[] {
  const k = s.speed ?? 1;
  const focusMs = (s.preset.focusMin * MIN_MS) / k;
  const cycleMs = focusMs + (s.preset.breakMin * MIN_MS) / k;
  return Array.from({ length: s.preset.rounds }, (_, i) => {
    const startMs = s.startedAtMs + i * cycleMs;
    return { round: i + 1, startMs, endMs: startMs + focusMs };
  });
}
```

- [ ] **Step 4: Run** `npx vitest run` → all pass.
- [ ] **Step 5: Commit** `git add src/lib/clock && git commit -m "Add fast mode to the clock"`

---

### Task 2: Presence rule

**Files:** Create `src/lib/presence/index.ts`; Test `src/lib/presence/presence.test.ts`

**Interfaces:** Produces `HIDDEN_GRACE_MS = 15_000`, `type PresenceInput = { touch: boolean; online: boolean; hiddenSinceMs: number | null }`, `isFocusing(i: PresenceInput, nowMs: number): boolean`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { HIDDEN_GRACE_MS, isFocusing } from "./index";

const T = 1_000_000;

describe("isFocusing", () => {
  it("is away whenever offline", () => {
    expect(isFocusing({ touch: false, online: false, hiddenSinceMs: null }, T)).toBe(false);
  });
  it("is focusing while visible", () => {
    expect(isFocusing({ touch: true, online: true, hiddenSinceMs: null }, T)).toBe(true);
  });
  it("gives touch devices a grace period when hidden", () => {
    const hidden = { touch: true, online: true, hiddenSinceMs: T };
    expect(isFocusing(hidden, T + HIDDEN_GRACE_MS - 1)).toBe(true);
    expect(isFocusing(hidden, T + HIDDEN_GRACE_MS)).toBe(false);
  });
  it("never counts a hidden desktop tab as away", () => {
    expect(isFocusing({ touch: false, online: true, hiddenSinceMs: T }, T + 10 * HIDDEN_GRACE_MS)).toBe(true);
  });
});
```

- [ ] **Step 2: Run** → FAIL (missing module).
- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `"Add the presence rule"`

---

### Task 3: Focus screen wording

**Files:** Create `src/lib/session/copy.ts`; Test `src/lib/session/copy.test.ts`

**Interfaces:** Consumes `ClockState`, `Phase` from `@/lib/clock`. Produces `STAGE_NAMES: readonly string[]` (8), `type Outcome = "pending" | "kept" | "lost"`, `listNames(names: string[]): string`, `subtitle(c: ClockState, rounds: number): string`, `caption(o: { phase: Phase; stage: string; meAway: boolean; dozing: string[]; outcome: Outcome }): { lead: string; rest: string }`, `peekTitle(o: { phase: Phase; focusing: number; dozing: string[]; meAway: boolean; outcome: Outcome }): string`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import type { ClockState } from "@/lib/clock";
import { caption, listNames, peekTitle, STAGE_NAMES, subtitle } from "./copy";

const focus = (round: number): ClockState => ({ phase: "focus", round, remainingMs: 1, focusProgress: 0 });
const base = { phase: "focus" as const, stage: "Walls pulled up", meAway: false, dozing: [], outcome: "pending" as const };

describe("listNames", () => {
  it("joins one, two and three names", () => {
    expect(listNames(["Maya"])).toBe("Maya");
    expect(listNames(["Leo", "Maya"])).toBe("Leo & Maya");
    expect(listNames(["Leo", "Maya", "Ashna"])).toBe("Leo, Maya & Ashna");
  });
});

describe("subtitle", () => {
  it("names the round and what comes next", () => {
    expect(subtitle(focus(1), 2)).toBe("Round 1 of 2 · until your break");
    expect(subtitle(focus(2), 2)).toBe("Round 2 of 2 · until the end");
    expect(subtitle({ phase: "break", round: 1, remainingMs: 1, focusProgress: 0.5 }, 2)).toBe("Break · back in a moment");
    expect(subtitle({ phase: "done", round: 2, remainingMs: 0, focusProgress: 1 }, 2)).toBe("See you next time");
  });
});

describe("caption", () => {
  it("covers every state", () => {
    expect(caption(base)).toEqual({ lead: "Everyone's focusing.", rest: "Walls pulled up." });
    expect(caption({ ...base, meAway: true })).toEqual({ lead: "You've stepped away.", rest: "The wheel slows down." });
    expect(caption({ ...base, dozing: ["Maya"] })).toEqual({ lead: "Maya has nodded off.", rest: "The wheel slows down." });
    expect(caption({ ...base, dozing: ["Leo", "Maya"] })).toEqual({ lead: "Leo & Maya have nodded off.", rest: "The wheel slows down." });
    expect(caption({ ...base, phase: "break", meAway: true })).toEqual({ lead: "Break.", rest: "The wheel rests, and tea is steeping." });
    expect(caption({ ...base, phase: "done" })).toEqual({ lead: "Finishing up.", rest: "The pot comes off the wheel." });
    expect(caption({ ...base, phase: "done", outcome: "kept" })).toEqual({ lead: "Session complete.", rest: "Your pot is finished." });
    expect(caption({ ...base, phase: "done", outcome: "lost" })).toEqual({ lead: "Session ended.", rest: "The clay goes back in the bag." });
  });
});

describe("peekTitle", () => {
  const p = { phase: "focus" as const, focusing: 1, dozing: [], meAway: false, outcome: "pending" as const };
  it("covers every state", () => {
    expect(peekTitle(p)).toBe("1 focusing");
    expect(peekTitle({ ...p, focusing: 0, meAway: true })).toBe("Stepped away");
    expect(peekTitle({ ...p, focusing: 3, dozing: ["Maya"] })).toBe("3 focusing · Maya dozing");
    expect(peekTitle({ ...p, phase: "break" })).toBe("On a break together");
    expect(peekTitle({ ...p, phase: "done", outcome: "kept" })).toBe("Session complete");
    expect(peekTitle({ ...p, phase: "done", outcome: "lost" })).toBe("Session ended");
  });
});

it("has Ashna's eight stage names", () => {
  expect(STAGE_NAMES).toHaveLength(8);
  expect(STAGE_NAMES[0]).toBe("Centring the clay");
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `"Add focus screen wording"`

---

### Task 4: Migration 0002

**Files:** Create `supabase/migrations/0002_sessions.sql`; Modify `docs/supabase-setup.md`

The full SQL is in the file created by this task (tables, RLS, `session_ends_at`, `_close_session`, `start_session`, `heartbeat`, `leave_session`, `finish_session`, grants) exactly as specified in the spec's Data section. Setup doc gains: paste 0002, the fast-mode switch

```sql
insert into public.app_settings (key, value) values ('dev_fast_sessions', 'on')
on conflict (key) do update set value = excluded.value;
```

and the piece 3 checklist.

- [ ] **Step 1: Write the migration.** **Step 2:** Cyril pastes it and the fast-mode insert into the SQL editor. **Step 3:** Probe with a script: start a fast session as host, heartbeat, confirm `session_running` on a second start, confirm `not_over` from an early finish on a real-speed session, and confirm a second guest can't read the session. **Step 4: Commit** `"Add 0002 migration: sessions, heartbeats and finishing"`

---

### Task 5: Session wrappers

**Files:** Create `src/lib/supabase/sessions.ts`; Test `src/lib/supabase/sessions.test.ts`

**Interfaces:** Produces `SessionRow`, `toClockSession(r): Session`, `SessionError`, `getOpenSession(client, podId): Promise<SessionRow | null>`, `startSession(client, podId, speed?): Promise<{ session: SessionRow } | { error }>`, `heartbeat(client, sessionId): Promise<{ serverMs: number } | { error }>`, `leaveSession(client, sessionId): Promise<{ ok: true } | { error }>`, `finishSession(client, sessionId): Promise<{ ok: true } | { error }>`, `getMyResult(client, sessionId, userId): Promise<boolean | null>`, `sessionErrorMessage(code): string`.

Tests (fake client with `rpc`, and `from().select().eq().is().maybeSingle()` chains): RPC argument pass-through for each function; known codes map through, unknown messages and thrown errors map to `network`; `heartbeat` parses the timestamp; `getOpenSession` filters `pod_id` and `ended_at is null`; `getMyResult` returns `present_at_end`; `toClockSession` converts a row.

- [ ] Steps: failing tests → run → implement → run → commit `"Add session wrappers"`

---

### Task 6: StudioScene running mode

**Files:** Modify `src/components/scene/StudioScene.tsx`

**Interfaces:** Produces `type SceneView = { progress: number; running: boolean; pace: number; status: "throwing" | "complete" | "abandoned" }`, `<StudioScene label view? onStage?>`. Without `view`: resting (unchanged behaviour).

Keep the latest `view` and `onStage` in refs (updated in an effect). After the pot is created, apply the current view. A second effect applies each change: `setProgress`, `setRunning`, `setPace`, then `complete()` / `abandon()` for those statuses (both are safe to repeat). `create` gets `onStage: (i) => onStageRef.current?.(i)`.

- [ ] Steps: implement → `tsc` + lint → commit `"Let StudioScene run from a view"`

---

### Task 7: The focus screen and starting a session

**Files:** Create `src/app/(pod)/p/[slug]/FocusSession.tsx`; Modify `src/app/(pod)/p/[slug]/Lobby.tsx`

**Lobby:** after `getPod`, also `getOpenSession(pod.id)`; with an open session render `<FocusSession pod members me session />`. Host: enabled **Start focusing** → `startSession(pod.id, speed)` where speed is 60 when the URL has `?speed=60`, "One moment…" while starting, error text above the button. Others: "Waiting for <host> to start".

**FocusSession:** `now` ticks every 250 ms (0 until the first tick → "One moment…"); clock = `phaseAt(toClockSession(session), now + offset)`. Presence state from `(pointer: coarse)`, `online`/`offline` and `visibilitychange` listeners → `isFocusing`. While focusing and not done: `heartbeat` immediately and every 15 s, updating `offset = clockOffset(sent, serverMs, received)`. Wake lock while visible and not done. When done: `finishSession` (retry every 2 s on error), then `getMyResult` → outcome. Scene view from `potteryView(…, { presentCount: focusing ? 1 : 0, memberCount: 1 })` with `status` from the outcome. Layout, sheet, Leave confirm and Done exactly as in the spec.

- [ ] Steps: implement → `tsc` + lint + build → commit `"Start sessions and add the focus screen"`

---

### Task 8: Verify

- [ ] All tests, `tsc`, lint, build.
- [ ] Script probe of the full server flow in fast mode (start → heartbeats → finish → `present_at_end = true`; and start → leave → finish → `false`).
- [ ] Screenshot the focus screen through a throwaway page or a real signed-in session, then remove any throwaway code.
- [ ] Cyril's manual click-through from the checklist.

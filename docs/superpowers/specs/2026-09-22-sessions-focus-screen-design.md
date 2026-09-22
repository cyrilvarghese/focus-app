# Piece 3: sessions and the focus screen

Date: 2026-09-22 · Status: agreed · Flow: `2026-09-22-user-flow-design.md` (piece 3, moved ahead of piece 2)

## Goal

The organizer taps **Start focusing**, and the pod's link turns into the focus screen: a shared countdown, Ashna's studio with the pot growing, breaks, stepping away, and an ending that records who was at the table. It works with one person; friends joining is piece 2.

## Decisions

| Topic | Decision |
|---|---|
| Order | Piece 3 before piece 2, because the organizer can start alone |
| Timer | Data, not a process: every client derives phase and countdown from the server's `started_at` and the preset (`phaseAt`), corrected by a server-time offset |
| Time tracking | Server-recorded through `heartbeat`, every 15 s while on the focus screen (PRD §9) |
| At the table at the end | Checked in within the 40 s before the scheduled end and hasn't tapped Leave since |
| Fast mode | `?speed=60` on the pod link when starting. Allowed only when `app_settings.dev_fast_sessions = 'on'`; refused otherwise |
| End screen | Minimal until piece 4: caption + **Done** |
| Realtime | Not in this piece. With one member nothing needs pushing; piece 2 adds it with joining |

## Data (`supabase/migrations/0002_sessions.sql`)

```
app_settings      key text pk · value text                         no access for anon/authenticated
sessions          id · pod_id → pods · started_by → auth.users · focus_min · break_min · rounds
                  · speed ∈ {1, 60} default 1 · started_at default now() · ended_at null
                  unique (pod_id) where ended_at is null            one open session per pod
session_members   session_id → sessions · user_id → auth.users · focus_text · present_at_end boolean null
                  primary key (session_id, user_id)
focus_intervals   id · session_id → sessions · user_id · started_at · last_heartbeat_at · ended_at null
```

A session's scheduled end is `started_at + (focus_min·rounds + break_min·(rounds−1)) minutes / speed`.

**RLS:** members of the pod can `select` its sessions, session_members and focus_intervals (through `is_pod_member`). No write policies; writes only through the functions below. All functions are `security definer`, `search_path = ''`, execute granted to `authenticated` only.

| Function | Does | Errors |
|---|---|---|
| `start_session(p_pod_id, p_speed default 1) → sessions` | Host only. Locks the pod, closes any open session whose time is already up, refuses if one is still running, copies the pod's preset, stamps `now()`, adds every pod member to `session_members` with their focus text | `not_signed_in`, `not_host`, `invalid_speed`, `fast_sessions_off`, `session_running` |
| `heartbeat(p_session_id) → timestamptz` | Returns server `now()`. If the session is open and not past its end: extends your open interval when the last check-in was < 40 s ago, otherwise closes it at its last check-in and opens a new one | `not_signed_in`, `not_in_session` |
| `leave_session(p_session_id)` | Closes your open interval at `now()` | `not_signed_in`, `not_in_session` |
| `finish_session(p_session_id)` | Any member. No-op if already ended. Refuses before the scheduled end. Otherwise sets `present_at_end`, closes open intervals, sets `ended_at` to the scheduled end | `not_signed_in`, `not_in_session`, `not_over` |

`present_at_end` = the member has an interval with `ended_at is null` and `last_heartbeat_at ≥ end − 40 s`. Closing is shared by `finish_session` and `start_session` (for a stale session) through one internal function with no grants.

## App modules (no React, no `next/*`)

| File | Contents |
|---|---|
| `src/lib/clock/phase.ts` | `Session` gains optional `speed` (default 1). `phaseAt` and `focusWindows` scale by it; results are in session time, windows in real time |
| `src/lib/presence/index.ts` | `HIDDEN_GRACE_MS = 15_000`, `isFocusing({ touch, online, hiddenSinceMs }, nowMs)`: offline → away; a hidden page is away after 15 s on touch devices, never on desktop |
| `src/lib/session/copy.ts` | `STAGE_NAMES` (Ashna's eight), `subtitle(clock, rounds)`, `caption({ phase, stage, meAway, dozing, result })`, `peekTitle({ phase, focusing, dozing })` |
| `src/lib/supabase/sessions.ts` | `SessionRow`, `toClockSession`, `getOpenSession`, `startSession`, `heartbeat`, `leaveSession`, `finishSession`, `getMyResult`, `sessionErrorMessage` |

## Screens

**Lobby.** The host's **Start focusing** is enabled; while starting it reads "One moment…"; errors show above it. Everyone else sees "Waiting for <host> to start". Opening the link while a session is open goes straight to the focus screen.

**Focus screen** (Ashna's `public/studio.html` layout):
- Top row: pod name, and an invite icon that opens the sheet
- Timer (Fraunces, never changes colour) and the sage subtitle: "Round 1 of 2 · until your break" / "Break · back in a moment" / "Round 2 of 2 · until the end"
- `StudioScene` driven by `{ progress, running, pace, status }`; its `onStage` feeds the caption
- Caption: **Everyone's focusing.** <stage>. · **You've stepped away.** The wheel slows down. · **Break.** The wheel rests, and tea is steeping. · **Session complete.** Your pot is finished. · **Session ended.** The clay goes back in the bag.
- Who's here bar ("1 focusing" / "Stepped away" / "On a break together" / "Session complete"). Tapping it or the invite icon opens rows (face, name, you/host, task, status), **Copy invite link** and **Leave**. Leave asks "Leave the session? You'll only get the pot if you're back before the end." then goes to `/`.
- Screen Wake Lock while visible. Heartbeats pause while away.
- At the end: calls `finish_session` (retrying while `not_over`), reads `present_at_end`, shows the result caption and **Done** → `/`.

`StudioScene` gains an optional `view` and `onStage`; without `view` it stays the resting Lobby scene.

## Testing

- Vitest: fast-mode `phaseAt` / `focusWindows`; `isFocusing` at the grace edges on touch and desktop and offline; every `subtitle` / `caption` / `peekTitle` branch; each session wrapper's pass-through and error mapping with fake clients.
- Manual (in `docs/supabase-setup.md`): apply `0002`, switch fast mode on, start alone with `?speed=60`, see a break, hide the tab for 20 s on a phone-sized touch emulation, reach the end, see "Session complete". Repeat with Leave → "Session ended". SQL checks: a non-host can't start, a second open session is refused, a real-speed session can't be finished early.

## Out of scope

Friends joining and live updates (piece 2), members who join a pod after its session started (piece 2), the reveal screen and shelf (piece 4), pal-minutes on screen.

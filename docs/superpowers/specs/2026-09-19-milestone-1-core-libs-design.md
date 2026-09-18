# Milestone 1: core libraries (clock + pottery rules)

Date: 2026-09-19 · Status: approved design · Branch: `worktree-milestone-1-core-libs`

## Goal

Build the pure, tested logic the rest of Focuspal sits on: the shared session clock and the pottery rules. Also add a plain `/solo` page that runs a local session end to end, and update the PRD to the product decided in the calm screens.

**The pottery animation is out of scope.** Ashna is building it: the wheel throw, the per-piece shapes, the finished-piece drawing, and the React components. This milestone defines the **`PotteryView` contract** her component takes, and produces those values.

## Product decisions (from brainstorming)

| Topic | Decision |
|---|---|
| What a pod builds | **One pot per session.** The shared island is retired; it survives only on `/cover`. |
| Which piece | Any session can make any design. The piece and glaze are **seeded by the session id**, so every client derives the same pot with nothing stored or synced. |
| Focus lengths | **15, 25, 45** min. Break 5, 10, 15. Rounds 1–4. |
| Early end | If **at least one person is present at the end**, the pot is kept. If nobody is present, it is discarded (it collapses). |
| Who gets the pot | **Only the people present at the end.** Others keep their minutes in stats. |
| Shelf data | Server-side, a query over `focus_intervals`, as in the PRD. |
| Streaks | None. |

## Modules

All of `src/lib/*` is plain TypeScript with no `next/*`, React or DOM imports, as the PRD's native-port rule requires.

### `src/lib/clock`

```ts
type Preset = { focusMin: 15 | 25 | 45; breakMin: 5 | 10 | 15; rounds: 1 | 2 | 3 | 4 };
type Session = { id: string; startedAtMs: number; preset: Preset };
type Phase = 'focus' | 'break' | 'done';
type ClockState = { phase: Phase; round: number; remainingMs: number; focusProgress: number };
```

- `FOCUS_OPTIONS`, `BREAK_OPTIONS`, `ROUND_OPTIONS`, `DEFAULT_PRESET` (25 / 5 × 2)
- `isValidPreset(p): p is Preset`
- `sessionTotalMs(preset)` = focus × rounds + break × (rounds − 1). There is no break after the last round.
- `focusWindows(session)` → `{ round, startMs, endMs }[]`, in absolute ms
- `phaseAt(session, nowMs)` → `ClockState`
  - `round` counts from 1. During a break, `round` is the round just finished.
  - `remainingMs` is the time left in the **current phase**.
  - `focusProgress` is focused time so far divided by total focus time, from 0 to 1. Break time doesn't count, so it holds steady during breaks. It maps directly onto the wheel's progress.
  - Elapsed time is clamped to at least 0 (for a clock that goes backwards or a start time in the future). At or after the end: `{ phase: 'done', round: rounds, remainingMs: 0, focusProgress: 1 }`.
- `clockOffset(sentMs, serverMs, receivedMs)` = `serverMs − (sentMs + receivedMs) / 2`. The server's time is then client time plus the offset.
- `formatTogether(min)` → `"55 minutes"`, `"1h"`, `"1h 35m"`. This fixes the prototype's trailing space in `"1h "`.
- `formatCountdown(ms)` → `"24:59"`, rounding **up** to the whole second so the display never reads 00:00 while time remains.

### `src/lib/pottery`

```ts
type PieceKind = 'cup' | 'bowl' | 'mug' | 'vase';
type Glaze = 'oat' | 'sage' | 'cream' | 'terracotta' | 'ink';
type Piece = { kind: PieceKind; glaze: Glaze };
type FocusInterval = { userId: string; startMs: number; endMs: number | null };
type PotStatus = 'idle' | 'throwing' | 'complete' | 'abandoned';

// The contract for Ashna's wheel component
type PotteryView = {
  kind: PieceKind;       // what the throw is heading toward
  glaze: Glaze;
  progress: number;      // 0..1, the clock's focusProgress
  running: boolean;      // true only during focus; the wheel spins down on breaks
  pace: number;          // 0..1, the share of members focusing (1 when solo and present)
  status: PotStatus;     // complete → glaze and reveal; abandoned → collapse
};
```

- `PIECE_KINDS`, `GLAZES`, `PIECE_NAMES` (`cup: 'little cup'`, `bowl: 'small bowl'`, `mug: 'mug'`, `vase: 'tall vase'`)
- `pieceFor(sessionId)` → `Piece`. A 32-bit FNV-1a hash of the id picks the kind (hash mod 4) and the glaze ((hash >>> 8) mod 5). It is deterministic and needs no stored state.
- `palMinutes(intervals, session, nowMs)` → a whole number:
  1. open intervals are capped at `nowMs`; zero-length and reversed intervals are dropped
  2. overlapping intervals **from the same user** are merged, so two tabs count once
  3. each interval is clipped to the session's focus windows
  4. everything is summed over all users, then converted from ms to minutes and floored
- `potOutcome(presentAtEnd: string[])` → `{ kept: boolean; recipients: string[] }`. It removes duplicates and keeps the pot only if at least one person is present.
- `potteryView(session, nowMs, { presentCount, memberCount, left?: boolean })` builds a `PotteryView` from the clock and the piece. Status is `abandoned` when `left` is true; otherwise `complete` when the phase is `done` (and `presentCount` is at least 1, else `abandoned`); otherwise `throwing`. `running` is `phase === 'focus'` and not left. Pace is `presentCount / max(1, memberCount)`, clamped to 0..1. `idle` is for the wheel's own use before any session exists (`/solo`'s setup state); `potteryView` never returns it.

### `/solo` (`src/app/solo/page.tsx`)

A client component with no backend and no animation.

- **Setup:** segmented controls for focus, break and rounds; the total ("55 minutes together"); **Start**.
- **Running:** a countdown, "Focus · Round 1 of 2" (or "Break"), the chosen piece ("Today's clay will become a small bowl"), and **Leave**.
- A clearly marked **placeholder slot** where `<PotteryWheel {...view} />` will go. It currently shows the live `PotteryView` values as a small readout.
- **End:**
  - done → "A small bowl, made together." plus minutes focused
  - left → "The clay went back in the bag."
- `?speed=N` multiplies elapsed time for development (for example `?speed=60`).
- It ticks once a second with `setInterval`, and computes state as `phaseAt(session, start + (Date.now() − start) × speed)`.
- It uses the calm screens' Linen & Sage tokens from `globals.css` where they exist. It doesn't need to look polished.

## Testing

Vitest in the Node environment, with test files next to the code (`*.test.ts`).

- **clock:** the total for every preset; phase at t = 0, just before and after each focus/break boundary, mid-break, the last ms, exactly the end, and after the end; one-round presets with no break; a negative elapsed time; `focusProgress` holding steady during a break; `clockOffset` maths; formatting (including the 60-minute and rounding-up cases).
- **pottery:** `pieceFor` is deterministic; 1,000 random ids produce all 4 kinds and all 5 glazes. `palMinutes`: clipping to windows, a break excluded, two tabs merged, open intervals capped, invalid intervals dropped, several users summed. `potOutcome`: empty, duplicates, several people. `potteryView` status and pace.
- **`/solo`:** checked by hand in the browser at `?speed=60`, through both endings.

## Tooling

- `npm i -D vitest`. To clear Vitest 5's peer requirement, `@types/node` is bumped to match the installed Node major version (22 or later).
- `package.json`: `"test": "vitest"`
- `vitest.config.mts`: `environment: 'node'`, and `@/` resolved to `src/`

## PRD updates (`docs/PRD.md`)

- Summary, principles, §7: the island becomes one pot per session; pal-minutes remain a stat, not a growth engine.
- §5 and §6: focus lengths 15/25/45; the lobby shows the table with pals; the summary reveals the pot.
- §6.6 and §6.7: kept only if someone is present at the end, and only they receive it; everyone leaving discards it.
- §10 screens: Journal and My pal become **My shelf** (`/shelf`); no tab bar; no streak.
- §11 data: `pods.focus_min` limited to 15/25/45; `session_members.present_at_end boolean`; no pot table, since the pot comes from `sessions.id`.
- §12 modules: `src/lib/pottery` replaces `src/lib/island`; the animation is owned by Ashna.
- §14 open questions: remove "pal-minutes favour larger pods" and "after the island is finished"; add "should `pieceFor` avoid repeating the pod's last piece?"
- §16 milestones: 1 = clock, pottery rules and `/solo` (this spec) plus the wheel animation (Ashna).

## Out of scope

The throw animation and per-piece shapes, finished-piece rendering, Supabase, presence detection, and the Summary and Shelf UI.

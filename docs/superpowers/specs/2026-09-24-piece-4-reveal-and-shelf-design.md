# Piece 4: the pot reveal and the dashboard's shelf and calendar

Date: 2026-09-24 · Status: agreed · Flow: `2026-09-22-user-flow-design.md` (piece 4)

## Goal

A session ends with the pot you made, and the dashboard becomes a record of every pot you kept: a shelf and a calendar of the days you focused.

## Decisions

| Topic | Decision |
|---|---|
| Pot art | Port Ashna's finished-pot drawing from `design/prototypes/focuspal-screens-clean.html` (`PROFILES`, `curve`, `pot`) into `src/lib/pottery/shape.ts`, drawn by `<FinishedPot>` |
| Which pots are yours | The sessions where `present_at_end` is true, which is already recorded by piece 3 |
| Headline minutes | Your own focused minutes ("50 minutes with your pod"); the row below shows each pal |
| No new tables | The shelf and calendar are queries over `session_members` and `focus_intervals` |
| Calendar | The current month, with arrows back and forward; days you kept a pot are marked |
| Glazes | `oat #e3d3b4 · sage #b8cdbb · cream #f1ebe0 · terracotta #dcbcab · ink #8f9599` |

## Screens

**Session complete** (inside `FocusSession`, once the outcome is known):
- Kept: the pot, large, on a sand disc; "A <piece name>, made together."; the sage line "<your minutes> with your pod"; a row of every member's face with their minutes; **Done** → `/`.
- Lost: "The clay went back in the bag." with "Nobody stayed to the end, so this <piece name> wasn't kept."; the same row; **Done** → `/`.

**Dashboard** (`/`):
- No pots: today's empty state, unchanged.
- With pots: rows of three pots on planks, newest first; the line "<n> pieces · <total> of focus"; the month calendar; **+ New session** stays at the top right.
- Calendar: month name with ‹ › arrows, weekday initials, the days of the month, and a sage disc on each day you kept a pot. Today has a ring. Future months are reachable but empty.

## Modules

| File | Contents |
|---|---|
| `src/lib/pottery/shape.ts` | `GLAZE_COLORS`, `potSvg(kind, glaze, w, h, { glint })` → an SVG string (no DOM) |
| `src/lib/calendar.ts` | `monthGrid(year, month)` → weeks of `{ date, day, inMonth }`; `ymd(ms)`; `MONTH_NAMES`, `WEEKDAY_INITIALS` |
| `src/lib/supabase/shelf.ts` | `getMyShelf(client, userId)` → `ShelfItem[]` (session id, ended date, pod name, kind, glaze, your minutes), newest first; `getSessionMinutes(client, sessionId, session)` → `Record<userId, minutes>` |
| `src/components/pottery/FinishedPot.tsx` | renders `potSvg` |
| `src/app/(pod)/_ui/Shelf.tsx`, `Calendar.tsx` | dashboard parts |
| `src/app/(pod)/Dashboard.tsx` | client component: loads the shelf, shows empty state or shelf + calendar |
| `src/app/(pod)/p/[slug]/SessionComplete.tsx` | the reveal |

## Testing

- Vitest: `potSvg` shape (every kind and glaze, sane viewBox, mug handle), `monthGrid` (month starts, leap years, week alignment), `getMyShelf` (filters to `present_at_end`, sorts newest first, derives kind and glaze from the session id, sums minutes), `getSessionMinutes` (per member, breaks not counted).
- Manual: run a fast session to the end → the reveal shows the pot and minutes → **Done** → the dashboard shows that pot and today marked. Leave early → "The clay went back in the bag." and no pot on the shelf.

## Out of scope

Friends joining (piece 2), tapping a pot for its session, streaks, "Save my progress".

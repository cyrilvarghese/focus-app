# User flow: dashboard to finished pot

Date: 2026-09-22 · Status: agreed · Supersedes the Home screen in `2026-09-19-m2-home-start-pod-design.md`

## The flow

1. **Dashboard (`/`).** Opening Focuspal signs you in silently as a guest, so `/` is always the post-login dashboard. There is no `/home`.
   - **No sessions yet:** a card, "**No sessions yet.** Your first pot is one session away.", and a **+ New session** button above it on the right.
   - **With sessions:** a shelf of the pots from past sessions and a calendar with focus days marked, plus **+ New session**.
2. **Start a pod (`/new`, step 1).** Name, focus (15 / 25 / 45 min), break (5 / 10 / 15), rounds (1–4), and the total ("55 minutes together"). **Continue**.
3. **Take your seat (`/new`, step 2).** Pick a pal, your name, what you're working on. **Sit down**.
4. **Lobby (`/p/<slug>`).** "Your table is set." Faces, open seats, the invite link with **Copy link**. The picture is Ashna's studio with the wheel resting and a lump of clay on it. The organizer can **Start focusing** at any time, even alone. Others see "Waiting for <host> to start".
5. **Friends join by link.** A non-member opening `/p/<slug>` sees Take your seat, with taken pals greyed and who has them. They can join before or after the session starts; after, they drop into the current round.
6. **Focus.** Everyone switches together: the shared timer, Ashna's studio with the pot growing through its stages, and the "Who's here" bar. The wheel slows when someone steps away and rests on breaks.
7. **Session complete.** Everyone still at the table sees the finished pot and each pal's minutes, and gets the pot on their shelf and the day on their calendar. **Done** returns to the dashboard.
8. **Dashboard** again, with the new pot on the shelf and today marked.

## Rules

- **The organizer can start alone.** No minimum number of people.
- **You get the pot if you're at the table when the session ends.** Stepping away and coming back before the end is fine. People who left don't get it. If everyone leaves, the pot isn't finished and nobody gets it.
- The pot grows as long as at least one person is focusing, faster with more people present (the milestone 1 pottery rules).
- Only finished sessions appear on the shelf and the calendar. A pod that was never started doesn't.
- Back from Start a pod → `/`. Back from Take your seat → Start a pod. Back from the Lobby → `/`.

## Build order

Each piece works end to end before the next starts.

1. **Dashboard empty state and the rewire.** `/` becomes the dashboard (the `studio.html` rewrite is removed; the prototype stays at `/studio.html`), `/home` goes away, Back buttons point to `/`.
2. **Friends join by link**, and the Lobby updates live as people sit down.
3. **Sessions and the focus screen.** Organizer start, the shared timer, presence, late join, Ashna's studio as a React component, and the resting-wheel Lobby.
4. **Session complete and the dashboard with sessions.** The pot reveal, awarding the pot to those present at the end, and the shelf and calendar.

Pieces 3 and 4 add a `sessions` table; its shape is decided in piece 3's spec.

## Open

- What a calendar day shows beyond "focused that day" (count of sessions, the piece made). Decide in piece 4.

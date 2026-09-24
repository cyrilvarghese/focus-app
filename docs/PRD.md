# Focuspal: Product Requirements (v1)

Status: draft for review · Date: 2026-09-19 · Owner: Cyril

## 1. Summary

Focuspal is a multiplayer focus timer. A small group of friends (a **pod**) starts a timed focus session together. While everyone stays focused in the real world, their pals sit around a studio table and throw one shared pot on the wheel. The pot takes shape as the session's focus time passes, and it's glazed and revealed at the end. If someone leaves, their pal dozes and the wheel slows. If everyone leaves, the clay collapses and nothing is kept. Each finished pot goes on the shelf of whoever stayed to the end.

The tagline from the mockups: *A little company. A lot more focus.*

## 2. Problem and goal

Focusing alone is hard, and body-doubling (working alongside someone) helps. Existing tools are either single-player (Forest) or pair strangers on video (Focusmate). Nothing lets a group of friends share a light, ambient, camera-free focus session.

**Goal for v1:** a pod of 2–4 friends can go from a shared link to a running, synchronized focus session in under a minute. They should want to come back, because their shelf of pots made together keeps growing.

## 3. Audience

Adults (students, knowledge workers, freelancers) who already have friends they'd like to focus with. The look is Linen & Sage: warm paper, ink linework, a sage accent, and four animal pals (bunny, dog, cat, koala).

## 4. Product principles

1. **Pause, never punish.** When someone leaves, their pal dozes and the wheel slows. The pot is kept as long as one person stays. The social signal is visible, never shaming.
2. **Joining takes one link.** No account, password or app store. Pick an animal, type a name, and you're in.
3. **The app rewards not using it.** During a round there is nothing to tap. The wheel is ambient, something to glance at and not something to play with.
4. **Together means synchronized.** Everyone sees the same countdown and the same pot at the same moment.
5. **Every session leaves something behind.** A finished pot goes on each stayer's shelf and is kept permanently.

## 5. Scope

### In v1

- Create a pod and share an invite link
- Join as a guest: choose a pal (animal and name) and set "your focus" text for the session
- Lobby that shows who is waiting
- Host-started session with a shared timer (focus 15 / 25 / 45 min, break 5 / 10 / 15, 1–4 rounds)
- One shared pot per session, thrown on the wheel as focus time passes, and revealed at the end
- Live presence: who is focusing, who stepped away
- Per-person time tracking, recorded with server time
- My shelf: your pots, gentle totals (today, this week, all time), and recent sessions. Optional "save my progress" by email.
- Mobile-first responsive web app, installable as a PWA

### Not in v1 (the design must not block these)

- Payments (Stripe). Who pays, host or individual, is undecided; see §14.
- Native apps through Capacitor
- Scheduled or recurring sessions
- Choosing the piece, extra glazes, cosmetics, extra animals
- Chat, reactions, video, audio
- Push notifications

## 6. Core flows

### 6.1 Create a pod
Home → **Start a pod** → name the pod, pick focus / break / rounds (default 25 / 5 × 2), choose your pal and type your focus → land in the lobby with **Copy link** (`/p/<slug>`).

### 6.2 Join a pod
Open the link → "Take your seat" screen: pod name, how many friends are waiting, a pal picker (animals already taken in this pod are disabled), name, "your focus" → **Take your seat** → lobby.
Returning members skip the pal picker and only update "your focus".

### 6.3 Lobby
Shows the table with the seated pals, and pals taking their seats as people join. The host sees **Start**, and everyone else sees "Waiting for <host> to start". A session can start with 1–4 members present.

### 6.4 Focus round
The screen shows the studio: the pals at the table and the pot on the wheel (the hero), plus the countdown, "Round 1 of 2" and the viewer's own focus text. There are two buttons: **Pod** (a sheet listing members, their focus text and their status) and **Leave**.
- The screen stays awake (Wake Lock API).
- The pot's shape follows the session's focus progress (lump → centred → opened → walls → the piece). Its final form, which is any of cup, bowl, mug or vase, is seeded by the session id, so everyone sees the same pot.
- When a member goes away, their pal dozes (a "z" appears and the pal is desaturated) and the wheel slows.

### 6.5 Break
The countdown continues in break styling. The pals relax, and the wheel spins down. Being away during a break has no effect.

### 6.6 Session end
If at least one member is present when the session ends (naturally or by **End session**), the pot is glazed and revealed on the sand disc. It goes on the shelf of **each member present at the end**. The summary shows pal-minutes and each member's focused minutes side by side, with no ranking. If nobody is present, the clay collapses and no pot is kept. Then everyone returns to the lobby.

### 6.7 Edge cases
- **Late join:** the member drops into the current round at the correct remaining time.
- **Host leaves:** the session continues, because the timer is data and not a process running on the host's device. Any member can then **End session**.
- **Everyone leaves:** the wheel stops and the session runs to its scheduled end. If someone comes back and is present at the end, the pot is kept for them. If nobody is, the clay collapses and nothing is kept.
- **Pod full (4):** the link shows "This pod is full".
- **Unknown link:** a friendly 404 with **Start a pod**.
- **Same user in two tabs:** counted once.

## 7. The pot

- There is **one pot per session**. It's rendered in SVG on a pottery wheel in the studio scene, with ambient animation (built by Ashna).
- **Shape follows focus progress:** `progress = focused time so far ÷ total focus time` (breaks don't count). The same progress drives the wheel on every client, because it comes from the shared clock.
- **Piece and glaze are seeded:** `pieceFor(session.id)` → one of cup, bowl, mug or vase, and one of oat, sage, cream, terracotta or ink. Nothing is stored, and every client derives the same pot.
- **Pace:** the wheel's speed follows the share of members focusing. A dozing pal slows it, and it spins down during breaks.
- **Pal-minutes** (one per present, focusing member per focus minute) are a summary stat only. They don't change the piece.
- **Kept or discarded:** kept if at least one member is present at the end, and given to exactly those members. Otherwise discarded.

## 8. Presence and "away"

A member is **focusing** during a focus round if their client is connected and sending heartbeats.

| Context | Away when… |
|---|---|
| Phone (touch device) | the app or page is hidden (switched app, locked screen) for more than **15 s**, or the connection is lost |
| Desktop | the tab is closed or the connection is lost. A background tab is **not** away, because the member is presumably working in another window. |

The 15 s grace period covers a glance at a notification or a network blip. While a member is away, they earn no pal-minutes. Returning resumes earning immediately.

Known limitation: a phone user's screen stays on during rounds. Wake Lock requires the page to be visible, so locking the phone counts as away. This matches Forest's model and is explained in onboarding as "Leave your phone face-up on the desk".

## 9. Identity and time tracking

- **Guest-first:** opening the app creates an anonymous Supabase user silently. All data attaches to that user ID.
- **Upgrade without migration:** "Save my progress" on My shelf (and, later, any payment) links an email to the *same* user ID through a magic link. No data moves.
- **Time is recorded by the server, not reported by the client.** While a member is focusing, the client calls a `heartbeat` RPC every 15 s. The server extends that member's open focus interval to the server's `now()` if the previous heartbeat is less than 90 s old (browsers throttle background-tab timers to about once a minute), and otherwise opens a new interval. A crashed client simply stops accruing.
- My shelf and all totals are queries over focus intervals and `session_members.present_at_end`.

## 10. Screens

| Screen | Route | Notes |
|---|---|---|
| Home | `/` | Your pal at the table, **Start a pod**, **Join with a link**, your recent pod. The shelf is in the top-right corner. No tab bar. |
| Start a pod | `/new` | Pod name, focus / break / rounds, total time, your pal, name, your focus |
| Join ("Take your seat") | `/p/[slug]/join` | Pal grid (taken pals greyed), name, your focus |
| Pod (lobby / studio / summary) | `/p/[slug]` | One route, and the view is driven by the session state |
| My shelf | `/shelf` | Your pots, totals (today, this week, all time; no streaks), recent sessions |
| Solo (dev) | `/solo` | Local session with no backend, for the clock and pottery rules. `?speed=N` |

## 11. Data model (Supabase / Postgres)

```
profiles         id (= auth.uid) · name · animal · created_at
pods             id · slug · name · host_id · focus_min ∈ {15,25,45} · break_min ∈ {5,10,15} · rounds 1–4 · created_at
pod_members      pod_id · user_id · animal · joined_at          unique(pod_id, user_id), unique(pod_id, animal), max 4
sessions         id · pod_id · started_by · focus_min · break_min · rounds · started_at · ended_at
session_members  session_id · user_id · focus_text · present_at_end boolean
focus_intervals  id · session_id · pod_id · user_id · round · started_at · ended_at · last_heartbeat_at
```

- **The timer is data.** The round and the remaining time are computed from `sessions.started_at` plus the preset. Clients correct for clock skew with a server-time offset measured at connect.
- **No pot table.** The pot is `pieceFor(sessions.id)`. A member's shelf is their sessions where `present_at_end` is true. `present_at_end` is set by `end_session` (or the scheduled close) from members whose last heartbeat is less than 90 s old.
- **Row Level Security:** members can read their own pods, those pods' sessions and their members. Users can write only their own profile and membership. `focus_intervals` is written only through the `heartbeat` RPC, which runs as security definer. `sessions` rows are created through a `start_session` RPC (host only) and ended through an `end_session` RPC.
- **Realtime:** one channel per pod. Presence carries `{user_id, status}` so the "dozing" pal updates instantly. Postgres changes on `sessions` drive the lobby → focus transitions.

## 12. Architecture

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Backend | Supabase: Postgres, anonymous auth plus magic link, Realtime presence, RPCs |
| Rendering | Inline SVG for the studio, pals and pot, animated with CSS and the pot's own frame loop |
| Hosting | Vercel |
| Later | Stripe Checkout plus a webhook · Capacitor shell for iOS and Android |

**Module boundaries** (each unit can be tested on its own):

- `src/lib/clock`: pure functions `(session, serverNow) → {phase, round, remainingMs, focusProgress}`
- `src/lib/pottery`: `pieceFor`, `palMinutes`, `potOutcome` and the `PotteryView` contract. No React.
- `src/lib/presence`: visibility and heartbeat rules `(events) → focusing | away`
- `src/lib/supabase`: the client, typed queries, and RPC wrappers. This is the only module that touches the network.
- `src/components/pottery/*`: the wheel and finished-piece renderers (Ashna), which take `PotteryView`
- `src/app/*`: routes, which are thin and compose the modules above

**Native-port constraints (apply from day one):** screens are client-rendered and talk to Supabase directly. They do not rely on server actions or server-only rendering for core flows. `src/lib/*` has no `next/*` imports. Nothing relies on hover, and all tap targets are at least 44 px.

## 13. Quality

- **Unit tests (Vitest):** clock math (round boundaries, late join, skew), the pottery rules (piece seeding, pal-minutes, pot outcome), and the presence state machine with its grace periods.
- **Database tests:** `heartbeat` interval logic, RLS (a non-member cannot read a pod, and a user cannot write another user's intervals), the pod size limit, and unique animals.
- **End-to-end tests (Playwright):** two browser contexts join one pod → the host starts → both show the same countdown (±1 s) → one goes hidden → the other sees the dozing pal → the session ends → the present member's shelf has the pot, and the absent member's does not.
- **Accessibility:** `prefers-reduced-motion` disables the ambient animation and the wheel's spin. All status is conveyed in text as well as in colour.
- **Performance:** the studio is a single SVG with 60 fps animation on a mid-range phone. Only the pot runs a per-frame loop, and it pauses while the tab is hidden.

## 14. Open questions

1. **Who pays, and for what?** Host-pays-for-pod or individual premium. This is deferred until real pods show what people value. The identity model supports both.
2. **Is the pod size limit of 4** right? It matches the four seats at the table in the mockups.
3. **Desktop "away" is lenient** (only a closed tab counts). Is that acceptable for v1?
4. **Should `pieceFor` avoid repeating the pod's previous piece?**
5. **Should the lobby hint at today's piece before starting?**

## 15. Success measures (first month with real friends)

- Time from opening a link to being seated in the lobby: under 60 s
- At least 70 % of started sessions reach the final round with 2 or more members still present
- Pods that finish one session start a second within 7 days

## 16. Milestones

1. **Clock, pottery rules and the wheel, no backend:** `src/lib/clock` and `src/lib/pottery` with tests, plus `/solo` (Cyril). The wheel animation and per-piece throws (Ashna).
2. **Identity and pods:** Supabase anonymous auth, create and join, the lobby with presence.
3. **Synchronized sessions:** `start_session`, clock sync, heartbeats, away detection, the shared wheel.
4. **Persistence surfaces:** the session summary and pot reveal, My shelf, "Save my progress".
5. **Polish:** PWA install, reduced motion, onboarding hint, deploy.

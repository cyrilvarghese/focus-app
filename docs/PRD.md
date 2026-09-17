# Focuspal: Product Requirements (v1)

Status: draft for review · Date: 2026-09-17 · Owner: Cyril

## 1. Summary

Focuspal is a multiplayer focus timer. A small group of friends (a **pod**) starts a timed focus session together. While everyone stays focused in the real world, the pod builds a shared isometric island in the app, one hand-drawn piece at a time. When someone leaves, the island slows down and their pal visibly dozes off. Building pauses, but nothing already built is ever destroyed.

The tagline from the mockups: *A little company. A lot more focus.*

## 2. Problem and goal

Focusing alone is hard, and body-doubling (working alongside someone) helps. Existing tools are either single-player (Forest) or pair strangers on video (Focusmate). Nothing lets a group of friends share a light, ambient, camera-free focus session.

**Goal for v1:** a pod of 2–4 friends can go from a shared link to a running, synchronized focus session in under a minute. They should want to come back, because their island has visibly grown.

## 3. Audience

Adults (students, knowledge workers, freelancers) who already have friends they'd like to focus with. The look is a grown-up storybook: intricate, cute and detailed, never childish. The brand is black ink linework with a mint accent (`#3ddc97`) and animal pals (bunny, dog, cat, koala).

## 4. Product principles

1. **Pause, never punish.** When someone leaves, building slows and their pal sleeps. Nothing already built is ever destroyed. The social signal is visible, never shaming.
2. **Joining takes one link.** No account, password or app store. Pick an animal, type a name, and you're in.
3. **The app rewards not using it.** During a round there is nothing to tap. The island is ambient, something to glance at and not something to play with.
4. **Together means synchronized.** Everyone sees the same countdown and the same island at the same moment.
5. **Progress is permanent.** The island belongs to the pod and persists across sessions.

## 5. Scope

### In v1

- Create a pod and share an invite link
- Join as a guest: choose a pal (animal and name) and set "your focus" text for the session
- Lobby that shows who is waiting
- Host-started session with a shared timer (preset rounds of focus and break)
- Shared isometric island that grows from the pod's combined focused time
- Live presence: who is focusing, who stepped away
- Per-person time tracking, recorded with server time
- Journal (past sessions) and My pal (identity, totals, optional "save my progress" by email)
- Mobile-first responsive web app, installable as a PWA

### Not in v1 (the design must not block these)

- Payments (Stripe). Who pays, host or individual, is undecided; see §14.
- Native apps through Capacitor
- Scheduled or recurring sessions
- Multiple island themes, cosmetics, extra animals
- Chat, reactions, video, audio
- Push notifications

## 6. Core flows

### 6.1 Create a pod
Home → **Create a pod** → name the pod and pick a preset (default 25 min focus / 5 min break × 2 rounds) → choose your pal → land in the lobby with a **Share link** button (`/p/<slug>`).

### 6.2 Join a pod
Open the link → "Take your seat" screen: pod name, how many friends are waiting, a pal picker (animals already taken in this pod are disabled), name, "your focus" → **Join pod** → lobby.
Returning members skip the pal picker and only update "your focus".

### 6.3 Lobby
Shows the table with the seated pals and the island as it currently stands. The host sees **Start**, and everyone else sees "Waiting for <host> to start". A session can start with 1–4 members present.

### 6.4 Focus round
The screen shows the island (the hero), the countdown, "Round 1 of 2", and the viewer's own focus text. There are two buttons: **Pod** (a sheet listing members, their focus text and their status) and **Leave**.
- The screen stays awake (Wake Lock API).
- Pieces drop into the island as the pod earns them, and the status line names each one ("Added: a lamp post").
- When a member goes away, their pal dozes (a "z" appears and the pal is desaturated) and building slows.

### 6.5 Break
The countdown continues in break styling. The pals relax, and members can pan and zoom the island. Being away during a break has no effect.

### 6.6 Session end
A summary screen shows total pod focus time, each member's focused minutes, and the pieces added this session. The session is written to each member's Journal. Then everyone returns to the lobby.

### 6.7 Edge cases
- **Late join:** the member drops into the current round at the correct remaining time.
- **Host leaves:** the session continues, because the timer is data and not a process running on the host's device. Any member can then **End session**.
- **Everyone leaves:** the session runs to its scheduled end with no growth, then closes.
- **Pod full (4):** the link shows "This pod is full".
- **Unknown link:** a friendly 404 with **Create a pod**.
- **Same user in two tabs:** counted once.

## 7. The island

- There is **one shared island per pod**, rendered as an isometric SVG diorama on a grid, with CSS ambient animation (smoke, windmill, water, fireflies, flicker, sway).
- An island is an ordered **build list** of about 25 pieces (cabin walls → roof → lit windows → … → fireflies). All pods share the same list in v1.
- **Growth rule:** the pod earns *pal-minutes*, which means one per present, focusing member per minute of a focus round. Every `PIECE_COST` pal-minutes (default **20**, tunable) unlocks the next piece.
  - A full pod of 4 earns 4 pal-minutes per minute. If one member goes away, the pod earns 3. "The island slows when someone leaves" follows from this rule with no special case.
  - A full default session with 4 members is about 200 pal-minutes, or roughly 10 pieces. An island completes in about 2–3 sessions.
- **The island is derived state.** The pieces shown equal `floor(total pod pal-minutes / PIECE_COST)`, computed from the recorded focus intervals. There is no separate "island progress" value that could drift.
- When the build list is complete, the island is "finished" and keeps its ambient life. Starting a new island is out of scope for v1.

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
- **Upgrade without migration:** "Save my progress" on My pal (and, later, any payment) links an email to the *same* user ID through a magic link. No data moves.
- **Time is recorded by the server, not reported by the client.** While a member is focusing, the client calls a `heartbeat` RPC every 15 s. The server extends that member's open focus interval to the server's `now()` if the previous heartbeat is less than 40 s old, and otherwise opens a new interval. A crashed client simply stops accruing.
- The Journal and all totals are queries over focus intervals.

## 10. Screens

| Screen | Route | Notes |
|---|---|---|
| Home | `/` | Hero illustration, **Create a pod**, **Join a pod** (paste a link or code), tab bar: Pods · Journal · My pal |
| Create pod | `/new` | Name, preset, pal |
| Join ("Take your seat") | `/p/[slug]/join` | Pal grid, name, focus text |
| Pod (lobby / focus / break / summary) | `/p/[slug]` | One route, and the view is driven by the session state |
| Journal | `/journal` | Past sessions: date, pod, minutes focused, pieces added |
| My pal | `/me` | Animal, name, lifetime totals, streak, "Save my progress" |

## 11. Data model (Supabase / Postgres)

```
profiles         id (= auth.uid) · name · animal · created_at
pods             id · slug · name · host_id · focus_min · break_min · rounds · created_at
pod_members      pod_id · user_id · animal · joined_at          unique(pod_id, user_id), unique(pod_id, animal), max 4
sessions         id · pod_id · started_by · focus_min · break_min · rounds · started_at · ended_at
session_members  session_id · user_id · focus_text
focus_intervals  id · session_id · pod_id · user_id · round · started_at · ended_at · last_heartbeat_at
```

- **The timer is data.** The round and the remaining time are computed from `sessions.started_at` plus the preset. Clients correct for clock skew with a server-time offset measured at connect.
- **Row Level Security:** members can read their own pods, those pods' sessions and their members. Users can write only their own profile and membership. `focus_intervals` is written only through the `heartbeat` RPC, which runs as security definer. `sessions` rows are created through a `start_session` RPC (host only) and ended through an `end_session` RPC.
- **Realtime:** one channel per pod. Presence carries `{user_id, status}` so the "dozing" pal updates instantly. Postgres changes on `sessions` drive the lobby → focus transitions.

## 12. Architecture

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Backend | Supabase: Postgres, anonymous auth plus magic link, Realtime presence, RPCs |
| Rendering | Inline SVG generated from grid data, plus CSS animation |
| Hosting | Vercel |
| Later | Stripe Checkout plus a webhook · Capacitor shell for iOS and Android |

**Module boundaries** (each unit can be tested on its own):

- `src/lib/clock`: pure functions `(session, serverNow) → {phase, round, remainingMs}`
- `src/lib/island`: the build list, the isometric projection, and `(palMinutes) → pieces[]`. No React.
- `src/lib/presence`: visibility and heartbeat rules `(events) → focusing | away`
- `src/lib/supabase`: the client, typed queries, and RPC wrappers. This is the only module that touches the network.
- `src/components/island/*`: React renderers for the pieces, the pals and the ambient effects
- `src/app/*`: routes, which are thin and compose the modules above

**Native-port constraints (apply from day one):** screens are client-rendered and talk to Supabase directly. They do not rely on server actions or server-only rendering for core flows. `src/lib/*` has no `next/*` imports. Nothing relies on hover, and all tap targets are at least 44 px.

## 13. Quality

- **Unit tests (Vitest):** clock math (round boundaries, late join, skew), the island growth function, and the presence state machine with its grace periods.
- **Database tests:** `heartbeat` interval logic, RLS (a non-member cannot read a pod, and a user cannot write another user's intervals), the pod size limit, and unique animals.
- **End-to-end tests (Playwright):** two browser contexts join one pod → the host starts → both show the same countdown (±1 s) → one goes hidden → the other sees the dozing pal → the session ends → the Journal has an entry.
- **Accessibility:** `prefers-reduced-motion` disables the ambient animation and the piece drop-in. All status is conveyed in text as well as in colour.
- **Performance:** the island is a single SVG with 60 fps CSS-only animation on a mid-range phone. No animation runs JS per frame.

## 14. Open questions

1. **Who pays, and for what?** Host-pays-for-pod or individual premium. This is deferred until real pods show what people value. The identity model supports both.
2. **Is the pod size limit of 4** right? It matches the four seats at the table in the mockups.
3. **Pal-minutes favour larger pods**, so a solo pod builds 4× slower. Should growth be normalized by pod size? v1 does not normalize.
4. **What happens after the island is finished:** a new island, an expansion, or themes? This will likely be the first premium feature.
5. **Desktop "away" is lenient** (only a closed tab counts). Is that acceptable for v1?

## 15. Success measures (first month with real friends)

- Time from opening a link to being seated in the lobby: under 60 s
- At least 70 % of started sessions reach the final round with 2 or more members still present
- Pods that finish one session start a second within 7 days

## 16. Milestones

1. **Island and solo timer, no backend:** port the mockup into `lib/island` and the components. A local timer drives growth.
2. **Identity and pods:** Supabase anonymous auth, create and join, the lobby with presence.
3. **Synchronized sessions:** `start_session`, clock sync, heartbeats, away detection, live growth.
4. **Persistence surfaces:** the session summary, Journal, My pal, "Save my progress".
5. **Polish:** PWA install, reduced motion, onboarding hint, deploy.

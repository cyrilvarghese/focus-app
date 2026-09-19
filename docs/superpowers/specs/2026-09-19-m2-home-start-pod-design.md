# Milestone 2, piece 1: Home, Start a pod, Take your seat, Lobby (host)

Date: 2026-09-19 · Status: design for review · Branch: `m2-home-start-pod`

## Goal

A host can open Focuspal, start a pod, take their seat, and land in a lobby with an invite link. This happens against a real Supabase backend, as a silent guest with no account.

Milestone 2 is split into three pieces, each with its own spec, plan and merge:

1. **This piece:** guest sign-in; Home → Start a pod → Take your seat → Lobby, for the host only; lobby without live updates
2. Join: friends arrive through the link or "I have a link", taken pals greyed, 4-person limit
3. Lobby with live presence

## Decisions

| Topic | Decision |
|---|---|
| Design source | `design/prototypes/focuspal-screens-clean.html` and the `designing-focuspal-screens` skill (Linen & Sage). Focus options are 15/25/45, not the prototype's 40. |
| Supabase | A hosted project. Keys are in `.env.local` (git-ignored). |
| Migrations | SQL files in `supabase/migrations/`, **pasted into the SQL editor** and written to be safe to re-run |
| Database tests | Manual checks from a checklist in `docs/supabase-setup.md`. No automated database tests in this piece. |
| Writes | Reads go through RLS. Writes go only through `security definer` RPCs. |
| `/` route | Unchanged: the rewrite to Ashna's `public/studio.html` stays. Home is at `/home`. |
| Studio scene | Owned by Ashna. Home and the Lobby show a marked slot. Only the four static pal faces are ported (`<PalFace>`). |

## Screens

All four screens are in a `src/app/(pod)/` route group. Its layout loads Fraunces and Inter and applies the Linen & Sage tokens under a `.linen` class, so `/cover` and `/solo` keep their current styles and the tokens don't clash with the existing `--text` and `--muted`.

| Screen | Route | Content | Main action |
|---|---|---|---|
| Home | `/home` | "Focuspal" wordmark · scene slot · "A little company. A lot more focus." | **Start a pod**. "I have a link" is a quiet text button, shown disabled until piece 2. |
| Start a pod | `/new`, step 1 | Back (to `/home`) · "Start a pod" · Name (prefilled "The afternoon pod") · Focus chips 15/25/45 · Break chips 5/10/15 · Rounds chips 1–4 · total ("55 minutes together") | **Continue** |
| Take your seat | `/new`, step 2 | Back (to step 1) · "Take your seat." · four pal faces as toggle buttons · Your name · What are you working on? | **Sit down**: calls `create_pod`, then goes to `/p/<slug>` |
| Lobby | `/p/[slug]` | Back (to `/home`) · pod name · "Your table is set." · scene slot · a row of faces, with the members plus "Open" for each empty seat up to 4, and "You" / "Host" under the relevant faces · invite row: `focuspal.app/p/<slug>` shown as the current origin, with **Copy link** | **Start focusing**, shown disabled with the line "Sessions arrive soon" |

- Steps 1 and 2 are **one client page** with step state, so no settings are lost between them.
- `<TakeYourSeat>` is a standalone component with props `{ takenBy?: Partial<Record<Pal, string>>, defaults, onSubmit, submitting, error }`, so piece 2 can reuse it for guests.
- The name and pal are **prefilled** from `profiles` when one exists.
- **Lobby for a non-member or an unknown slug:** "This pod is private for now." plus **Back home**. Piece 2 turns this into the join screen. The page can't tell "not a member" from "doesn't exist", because RLS hides both, and that's fine.
- **Copy link** uses `navigator.clipboard.writeText`. On success the button reads "Copied" for 2 s. If the clipboard is unavailable, the text is selected so it can be copied by hand.
- **Form rules:** pod name 1–40 characters, display name 1–24, focus text 0–80 (all trimmed). **Continue** and **Sit down** stay disabled until the step is valid, and a hint appears under a field only after it has been touched.
- **Sign-in state:** each page calls `ensureGuest()` on mount. While that's pending, the main button shows "One moment…". On failure, the screen shows "Can't reach Focuspal right now." with **Try again**.

## Data (`supabase/migrations/0001_pods.sql`)

```
profiles     id uuid pk → auth.users on delete cascade · name text (1–24) · animal text ∈ pals · created_at
pods         id uuid pk · slug text unique · name text (1–40) · host_id uuid → auth.users
             · focus_min ∈ {15,25,45} · break_min ∈ {5,10,15} · rounds 1–4 · created_at
pod_members  pod_id → pods on delete cascade · user_id → auth.users on delete cascade
             · display_name text (1–24) · animal text ∈ pals · focus_text text (≤ 80, default '')
             · joined_at · primary key (pod_id, user_id) · unique (pod_id, animal)
```

`pals` = `bunny, cat, dog, koala`. Lengths are measured after `btrim`.

**RLS** (enabled on all three tables)
- `profiles`: `select`, `insert` and `update` where `id = auth.uid()`
- `pods`: `select` where `is_pod_member(id)`
- `pod_members`: `select` where `is_pod_member(pod_id)`
- No `insert`, `update` or `delete` policies on `pods` or `pod_members`
- `is_pod_member(p uuid) returns boolean`: `security definer`, `stable`, with `search_path = ''`. It checks for a `pod_members` row with that pod and `auth.uid()`. Being `security definer` is what avoids the rule referring back to itself.

**`create_pod(p_name, p_focus_min, p_break_min, p_rounds, p_animal, p_display_name, p_focus_text) returns text`**
- `security definer` with `search_path = ''`. Execute is revoked from `public` and `anon` and granted to `authenticated`. (Anonymous guests use the `authenticated` role.)
- It runs these steps in one transaction, stopping at the first failure:
  1. `auth.uid()` is null → error `not_signed_in`
  2. Validate the inputs, with errors `invalid_name`, `invalid_preset`, `invalid_animal`, `invalid_display_name`, `invalid_focus_text`
  3. Upsert `profiles (id, name = display_name, animal)`
  4. Generate a slug: 6 characters from `abcdefghjkmnpqrstuvwxyz23456789`, retrying on collision up to 5 times, then error `slug_exhausted`
  5. Insert the pod with `host_id = auth.uid()`, and insert the host's `pod_members` row
  6. Return the slug
- Errors are raised with `raise exception '<code>'`, so the client sees `error.message === '<code>'`.

**Re-runnable:** `create table if not exists`, `drop policy if exists` then `create policy`, and `create or replace function`.

## App modules (no React, no `next/*`)

| File | Contents |
|---|---|
| `src/lib/pals.ts` | `PALS`, `type Pal`, `isPal`, `LIMITS` (pod name 40, display name 24, focus text 80), `validatePodName` / `validateDisplayName` / `validateFocusText` → `string \| null` (the hint), matching the SQL checks |
| `src/lib/supabase/client.ts` | `getSupabase()`: one shared browser client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Throws `SupabaseConfigError` ("Supabase isn't configured: copy .env.local.example to .env.local") if either is missing. |
| `src/lib/supabase/auth.ts` | `ensureGuest(client) → Promise<{ userId } \| { error: 'guest_signin_disabled' \| 'network' }>`. Reuses the session from `getSession()`; otherwise calls `signInAnonymously()`. `error.code === 'anonymous_provider_disabled'` maps to `guest_signin_disabled`, and any other failure to `network`. |
| `src/lib/supabase/pods.ts` | `createPod(client, input) → { slug } \| { error: PodError }`; `getPod(client, slug) → { pod, members } \| null`; `getMyProfile(client, userId) → Profile \| null`; `podErrorMessage(code)` → friendly text |
| `src/lib/supabase/types.ts` | Hand-written `Profile`, `Pod`, `PodMember` row types |

## Components

- `src/components/pals/PalFace.tsx`: static SVG faces for the four pals, ported from the clean prototype's face drawing. Props are `{ pal, size, dimmed? }`. It uses `aria-hidden`, since the button around it carries the label.
- `src/components/scene/SceneSlot.tsx`: a dashed placeholder, "Studio scene (Ashna)", with a fixed aspect ratio, so layouts don't jump when the real scene arrives.
- `src/app/(pod)/_ui/`: `Chips`, `Field`, `PrimaryButton`, `TextButton`, `IconButton`. These are small components styled with Tailwind utilities on the `.linen` tokens.

## Testing

- **Vitest (automatic):**
  - `pals.ts`: each validator at its edges (empty, whitespace only, at the limit, one over the limit)
  - `auth.ts`: an existing session is reused without a sign-in; no session leads to `signInAnonymously`; the disabled provider maps to `guest_signin_disabled`; other errors map to `network`
  - `pods.ts`: `createPod` passes the RPC arguments through and maps RPC error messages to `PodError`; `getPod` returns `null` when the pod select is empty
  - All of these use a small hand-written fake client, with no network.
- **Manual (in `docs/supabase-setup.md`):**
  1. Setup: turn on anonymous sign-ins, paste `0001_pods.sql`, fill in `.env.local`
  2. Click-through: `/home` → Start a pod → Continue → choose a pal and a name → Sit down → the Lobby shows you as host, and Copy link works
  3. Reload the Lobby, and you're still the same guest and still the host
  4. Open the lobby link in a private window, and you see "This pod is private for now."
  5. SQL editor checks, running as `authenticated` with `request.jwt.claims`: you can't select another user's profile, you can't select a pod you're not in, and a direct `insert into pods` is denied

## Out of scope

Joining and "I have a link" (piece 2), live presence (piece 3), sessions and the timer (milestone 3), the studio scene (Ashna), automated database tests, and pushing to `origin`.

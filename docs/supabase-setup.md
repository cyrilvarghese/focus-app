# Supabase setup (milestone 2)

Focuspal uses a hosted Supabase project. Migrations are plain SQL you paste into the SQL editor; each file is safe to run again.

## One-time setup

1. Create a project at supabase.com. Any region.
2. **Authentication → Providers → Anonymous sign-ins: on.** Guests use this. (The app shows "Guest sign-in is turned off for this project." if it's off.)
3. **SQL Editor → New query**, paste `supabase/migrations/0001_pods.sql`, Run. Expect "Success. No rows returned".
4. **Project Settings → API**: copy the project URL and the publishable key into `.env.local` (see `.env.local.example`). Restart `npm run dev` after editing it.

## Manual checklist (piece 1)

Click-through, in a normal window:

- [ ] `/` (the dashboard, "No sessions yet.") → **+ New session** → **Continue** → choose a pal and a name → **Sit down** → the Lobby shows you as "You · Host", three "Open" seats, and **Copy link** reads "Copied" for 2 s.
- [ ] Reload the Lobby: same guest, still the host.
- [ ] Open the lobby link in a private window: "This pod is private for now." with **Back home**.
- [ ] Clear the pod name on Start a pod: **Continue** is greyed and the hint appears.

SQL editor checks. Run each as the `authenticated` role with a fake JWT, replacing `<uid>` with a real `auth.users.id` from **Authentication → Users**:

```sql
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uid>","role":"authenticated"}', true);

-- [ ] can read own profile only
select * from public.profiles;                     -- 0 or 1 row, never another user's

-- [ ] can read only pods you sit in
select slug from public.pods;                      -- only your pods

-- [ ] direct writes are denied
insert into public.pods (slug, name, host_id, focus_min, break_min, rounds)
  values ('zzzzzz', 'x', '<uid>', 25, 5, 2);       -- ERROR: permission denied for table pods

reset role;
```

## Sessions (piece 3)

1. **SQL Editor → New query**, paste `supabase/migrations/0002_sessions.sql`, Run.
2. In a **development** project only, switch fast mode on (never in production):

   ```sql
   insert into public.app_settings (key, value) values ('dev_fast_sessions', 'on')
   on conflict (key) do update set value = excluded.value;
   ```

   Then open a lobby as `/p/<slug>?speed=60` before tapping **Start focusing**: each minute of the session takes a second.

Checklist, with fast mode:

- [ ] Start a pod (15 min, 5 min, 2 rounds) → Lobby `?speed=60` → **Start focusing** → the focus screen counts down from 15:00, the wheel turns and the caption names each stage.
- [ ] After ~15 s the break starts: "Break · back in a moment", the wheel rests.
- [ ] Reload mid-session: straight back to the focus screen at the right time.
- [ ] Phone-sized with touch (DevTools device mode): hide the tab for 20 s, come back: "You've stepped away." while hidden, back to focusing after.
- [ ] Let it run out: "**Session complete.** Your pot is finished." and **Done** goes to `/`.
- [ ] Run another, open the sheet, **Leave** → confirm → `/`. Reopen the link after the end: "**Session ended.** The clay goes back in the bag." isn't shown because you're back in the lobby; check in SQL that `present_at_end` is false for that session.

SQL checks (as `authenticated` with a fake JWT, as above):

- [ ] `select public.start_session('<pod id>');` as someone who isn't the host → `not_host`.
- [ ] Twice in a row as the host → the second is `session_running`.
- [ ] `select public.finish_session('<session id>');` right after starting at normal speed → `not_over`.

## Resetting

`drop table public.pod_members, public.pods, public.profiles cascade;` then re-run `0001_pods.sql`.

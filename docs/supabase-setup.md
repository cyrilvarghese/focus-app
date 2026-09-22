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

## Resetting

`drop table public.pod_members, public.pods, public.profiles cascade;` then re-run `0001_pods.sql`.

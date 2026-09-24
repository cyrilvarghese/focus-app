-- Focuspal 0002: sessions, session_members, focus_intervals, and the functions that write them.
-- Needs 0001. Paste into Supabase → SQL Editor → New query → Run. Safe to run again after changes.

-- ─────────────────────────── settings (dev fast mode)

-- Not readable or writable from the app. Switch fast mode on in a dev project with:
--   insert into public.app_settings (key, value) values ('dev_fast_sessions', 'on')
--   on conflict (key) do update set value = excluded.value;
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- ─────────────────────────── tables

create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references public.pods (id) on delete cascade,
  started_by uuid not null references auth.users (id) on delete cascade,
  focus_min  int  not null check (focus_min in (15, 25, 45)),
  break_min  int  not null check (break_min in (5, 10, 15)),
  rounds     int  not null check (rounds between 1 and 4),
  speed      int  not null default 1 check (speed in (1, 60)),
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
-- At most one open session per pod.
create unique index if not exists sessions_one_open_per_pod on public.sessions (pod_id) where ended_at is null;

create table if not exists public.session_members (
  session_id     uuid not null references public.sessions (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  focus_text     text not null default '',
  -- Set when the session closes: true if they were at the table at the end (and so get the pot).
  present_at_end boolean,
  primary key (session_id, user_id)
);
create index if not exists session_members_user_id_idx on public.session_members (user_id);

create table if not exists public.focus_intervals (
  id                bigint generated always as identity primary key,
  session_id        uuid not null references public.sessions (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  started_at        timestamptz not null,
  last_heartbeat_at timestamptz not null,
  ended_at          timestamptz
);
create index if not exists focus_intervals_session_user_idx on public.focus_intervals (session_id, user_id);

-- ─────────────────────────── row-level security

alter table public.sessions        enable row level security;
alter table public.session_members enable row level security;
alter table public.focus_intervals enable row level security;

-- Writes only ever happen inside the security-definer functions below.
revoke insert, update, delete on public.sessions, public.session_members, public.focus_intervals from anon, authenticated;

drop policy if exists "sessions: members read" on public.sessions;
create policy "sessions: members read" on public.sessions for select to authenticated
  using (public.is_pod_member(pod_id));

drop policy if exists "session_members: members read" on public.session_members;
create policy "session_members: members read" on public.session_members for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.is_pod_member(s.pod_id)));

drop policy if exists "focus_intervals: members read" on public.focus_intervals;
create policy "focus_intervals: members read" on public.focus_intervals for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.is_pod_member(s.pod_id)));

-- ─────────────────────────── helpers

-- The scheduled end: focus for every round, a break between rounds, sped up in fast mode.
create or replace function public.session_ends_at(s public.sessions)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select s.started_at + make_interval(mins => s.focus_min * s.rounds + s.break_min * (s.rounds - 1)) / s.speed;
$$;

revoke execute on function public.session_ends_at(public.sessions) from public, anon;
grant  execute on function public.session_ends_at(public.sessions) to authenticated;

-- Records who was at the table at the scheduled end, closes every open interval, marks the session ended.
-- Internal: no grants, so only the functions below (running as the owner) can call it.
create or replace function public._close_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
begin
  select public.session_ends_at(s) into v_end
  from public.sessions s
  where s.id = p_session_id and s.ended_at is null;
  if v_end is null then return; end if;

  update public.session_members m
  set present_at_end = exists (
    select 1 from public.focus_intervals i
    where i.session_id = p_session_id
      and i.user_id = m.user_id
      and i.ended_at is null
      and i.last_heartbeat_at >= v_end - interval '90 seconds'
  )
  where m.session_id = p_session_id;

  update public.focus_intervals
  set ended_at = least(last_heartbeat_at, v_end)
  where session_id = p_session_id and ended_at is null;

  update public.sessions set ended_at = v_end where id = p_session_id;
end;
$$;

revoke execute on function public._close_session(uuid) from public, anon, authenticated;

-- ─────────────────────────── start_session

-- The organizer starts a session for everyone seated. Returns the new session row.
create or replace function public.start_session(p_pod_id uuid, p_speed int default 1)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_pod  public.pods;
  v_open public.sessions;
  v_new  public.sessions;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;

  -- Locking the pod serialises two taps on Start.
  select * into v_pod from public.pods where id = p_pod_id for update;
  if not found or v_pod.host_id <> v_uid then raise exception 'not_host'; end if;

  if p_speed is null or p_speed not in (1, 60) then raise exception 'invalid_speed'; end if;
  if p_speed <> 1 and not exists (
    select 1 from public.app_settings where key = 'dev_fast_sessions' and value = 'on'
  ) then
    raise exception 'fast_sessions_off';
  end if;

  select * into v_open from public.sessions where pod_id = p_pod_id and ended_at is null;
  if found then
    if now() >= public.session_ends_at(v_open) then
      perform public._close_session(v_open.id);   -- its time is up; nobody closed it
    else
      raise exception 'session_running';
    end if;
  end if;

  insert into public.sessions (pod_id, started_by, focus_min, break_min, rounds, speed)
  values (p_pod_id, v_uid, v_pod.focus_min, v_pod.break_min, v_pod.rounds, p_speed)
  returning * into v_new;

  insert into public.session_members (session_id, user_id, focus_text)
  select v_new.id, m.user_id, m.focus_text from public.pod_members m where m.pod_id = p_pod_id;

  return v_new;
end;
$$;

revoke execute on function public.start_session(uuid, int) from public, anon;
grant  execute on function public.start_session(uuid, int) to authenticated;

-- ─────────────────────────── heartbeat

-- Called every 15 s while on the focus screen. Time is the server's, never the client's.
-- Returns the server's now so clients can correct their clocks.
create or replace function public.heartbeat(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_s   public.sessions;
  v_iv  public.focus_intervals;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.session_members where session_id = p_session_id and user_id = v_uid) then
    raise exception 'not_in_session';
  end if;

  select * into v_s from public.sessions where id = p_session_id;
  if v_s.ended_at is not null or v_now >= public.session_ends_at(v_s) then
    return v_now;
  end if;

  select * into v_iv from public.focus_intervals
  where session_id = p_session_id and user_id = v_uid and ended_at is null
  order by started_at desc
  limit 1
  for update;

  if found and v_now - v_iv.last_heartbeat_at < interval '90 seconds' then
    update public.focus_intervals set last_heartbeat_at = v_now where id = v_iv.id;
  else
    -- Gone for more than 90 s: that stretch ended at the last check-in, and a new one starts now.
    if found then
      update public.focus_intervals set ended_at = v_iv.last_heartbeat_at where id = v_iv.id;
    end if;
    insert into public.focus_intervals (session_id, user_id, started_at, last_heartbeat_at)
    values (p_session_id, v_uid, v_now, v_now);
  end if;

  return v_now;
end;
$$;

revoke execute on function public.heartbeat(uuid) from public, anon;
grant  execute on function public.heartbeat(uuid) to authenticated;

-- ─────────────────────────── leave_session

-- Tapping Leave closes your stretch now. Coming back before the end opens a new one.
create or replace function public.leave_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.session_members where session_id = p_session_id and user_id = v_uid) then
    raise exception 'not_in_session';
  end if;

  update public.focus_intervals
  set ended_at = now()
  where session_id = p_session_id and user_id = v_uid and ended_at is null;
end;
$$;

revoke execute on function public.leave_session(uuid) from public, anon;
grant  execute on function public.leave_session(uuid) to authenticated;

-- ─────────────────────────── finish_session

-- Any member's app calls this when the timer runs out. Safe to call more than once.
create or replace function public.finish_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_s   public.sessions;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.session_members where session_id = p_session_id and user_id = v_uid) then
    raise exception 'not_in_session';
  end if;

  select * into v_s from public.sessions where id = p_session_id for update;
  if v_s.ended_at is not null then return; end if;
  if now() < public.session_ends_at(v_s) then raise exception 'not_over'; end if;

  perform public._close_session(p_session_id);
end;
$$;

revoke execute on function public.finish_session(uuid) from public, anon;
grant  execute on function public.finish_session(uuid) to authenticated;

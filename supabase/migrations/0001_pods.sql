-- Focuspal 0001: profiles, pods, pod_members, row-level security, create_pod.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again after changes.

-- ─────────────────────────── tables

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 24),
  animal     text not null check (animal in ('bunny', 'cat', 'dog', 'koala')),
  created_at timestamptz not null default now()
);

create table if not exists public.pods (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  host_id    uuid not null references auth.users (id) on delete cascade,
  focus_min  int  not null check (focus_min in (15, 25, 45)),
  break_min  int  not null check (break_min in (5, 10, 15)),
  rounds     int  not null check (rounds between 1 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.pod_members (
  pod_id       uuid not null references public.pods (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  animal       text not null check (animal in ('bunny', 'cat', 'dog', 'koala')),
  focus_text   text not null default '' check (char_length(focus_text) <= 80),
  joined_at    timestamptz not null default now(),
  primary key (pod_id, user_id),
  unique (pod_id, animal)
);

create index if not exists pod_members_user_id_idx on public.pod_members (user_id);

-- ─────────────────────────── row-level security

alter table public.profiles    enable row level security;
alter table public.pods        enable row level security;
alter table public.pod_members enable row level security;

-- Writes to pods and pod_members only ever happen inside security-definer RPCs.
revoke insert, update, delete on public.pods, public.pod_members from anon, authenticated;
revoke all on public.profiles from anon;

-- True when the signed-in user sits in this pod. Security definer, so policies on
-- pod_members can call it without the policy checking itself forever.
create or replace function public.is_pod_member(p_pod_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pod_members m
    where m.pod_id = p_pod_id and m.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_pod_member(uuid) from public, anon;
grant  execute on function public.is_pod_member(uuid) to authenticated;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "pods: members read" on public.pods;
create policy "pods: members read" on public.pods for select to authenticated using (public.is_pod_member(id));

drop policy if exists "pod_members: members read" on public.pod_members;
create policy "pod_members: members read" on public.pod_members for select to authenticated using (public.is_pod_member(pod_id));

-- ─────────────────────────── create_pod

-- Creates a pod, seats the caller as host, saves their profile defaults, returns the slug.
-- Errors are raised as short codes the app maps to friendly text.
create or replace function public.create_pod(
  p_name         text,
  p_focus_min    int,
  p_break_min    int,
  p_rounds       int,
  p_animal       text,
  p_display_name text,
  p_focus_text   text default ''
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_name     text := btrim(coalesce(p_name, ''));
  v_display  text := btrim(coalesce(p_display_name, ''));
  v_focus    text := btrim(coalesce(p_focus_text, ''));
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_slug     text;
  v_pod_id   uuid;
  i          int;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'invalid_name'; end if;
  if p_focus_min is null or p_break_min is null or p_rounds is null
     or p_focus_min not in (15, 25, 45)
     or p_break_min not in (5, 10, 15)
     or p_rounds not between 1 and 4 then
    raise exception 'invalid_preset';
  end if;
  if p_animal is null or p_animal not in ('bunny', 'cat', 'dog', 'koala') then raise exception 'invalid_animal'; end if;
  if char_length(v_display) not between 1 and 24 then raise exception 'invalid_display_name'; end if;
  if char_length(v_focus) > 80 then raise exception 'invalid_focus_text'; end if;

  insert into public.profiles (id, name, animal)
  values (v_uid, v_display, p_animal)
  on conflict (id) do update set name = excluded.name, animal = excluded.animal;

  for attempt in 1..5 loop
    v_slug := '';
    for i in 1..6 loop
      v_slug := v_slug || substr(v_alphabet, 1 + floor(random() * char_length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.pods (slug, name, host_id, focus_min, break_min, rounds)
      values (v_slug, v_name, v_uid, p_focus_min, p_break_min, p_rounds)
      returning id into v_pod_id;
      exit;
    exception when unique_violation then
      v_pod_id := null;
    end;
  end loop;
  if v_pod_id is null then raise exception 'slug_exhausted'; end if;

  insert into public.pod_members (pod_id, user_id, display_name, animal, focus_text)
  values (v_pod_id, v_uid, v_display, p_animal, v_focus);

  return v_slug;
end;
$$;

revoke execute on function public.create_pod(text, int, int, int, text, text, text) from public, anon;
grant  execute on function public.create_pod(text, int, int, int, text, text, text) to authenticated;

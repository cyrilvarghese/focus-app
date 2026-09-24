-- Focuspal 0003: what kind of work each pal sat down to do.
-- Needs 0001. Paste into Supabase → SQL Editor → New query → Run. Safe to run again after changes.

alter table public.pod_members add column if not exists tags text[] not null default '{}';

-- Up to three, from the list in src/lib/tags.ts, with no repeats.
-- A check constraint can't contain a subquery, so the rule lives in one immutable function
-- that both the constraint and create_pod use.
create or replace function public.tags_ok(p_tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(p_tags, 1), 0) <= 3
     and coalesce(p_tags, '{}') <@ array['Deep work', 'Writing', 'Code', 'Design', 'Study', 'Admin', 'Reading', 'Planning']
     and coalesce(array_length(p_tags, 1), 0) = (select count(distinct t) from unnest(coalesce(p_tags, '{}')) t);
$$;

revoke execute on function public.tags_ok(text[]) from public, anon;
grant  execute on function public.tags_ok(text[]) to authenticated;

alter table public.pod_members drop constraint if exists pod_members_tags_valid;
alter table public.pod_members add constraint pod_members_tags_valid check (public.tags_ok(tags));

-- create_pod gains p_tags. Dropping first keeps one version of the function, so calls are never ambiguous.
drop function if exists public.create_pod(text, int, int, int, text, text, text);
drop function if exists public.create_pod(text, int, int, int, text, text, text, text[]);

create function public.create_pod(
  p_name         text,
  p_focus_min    int,
  p_break_min    int,
  p_rounds       int,
  p_animal       text,
  p_display_name text,
  p_focus_text   text default '',
  p_tags         text[] default '{}'
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
  v_tags     text[] := coalesce(p_tags, '{}');
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
  if not public.tags_ok(v_tags) then raise exception 'invalid_tags'; end if;

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

  insert into public.pod_members (pod_id, user_id, display_name, animal, focus_text, tags)
  values (v_pod_id, v_uid, v_display, p_animal, v_focus, v_tags);

  return v_slug;
end;
$$;

revoke execute on function public.create_pod(text, int, int, int, text, text, text, text[]) from public, anon;
grant  execute on function public.create_pod(text, int, int, int, text, text, text, text[]) to authenticated;

-- Focuspal 0004: joining a pod through its link, and live updates in the lobby.
-- Needs 0001–0003. Paste into Supabase → SQL Editor → New query → Run. Safe to run again after changes.

-- ─────────────────────────── pod_preview

-- What someone holding the link may see before they sit down: the pod's name, who is seated
-- (pal and first name), whether it's full, and whether they're already a member.
-- Security definer, because row-level security hides the pod from non-members.
create or replace function public.pod_preview(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_pod     public.pods;
  v_members jsonb;
  v_host    text;
  v_count   int;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;

  select * into v_pod from public.pods where slug = p_slug;
  if not found then return null; end if;

  select
    coalesce(jsonb_agg(jsonb_build_object('animal', m.animal, 'display_name', m.display_name) order by m.joined_at), '[]'::jsonb),
    max(case when m.user_id = v_pod.host_id then m.display_name end),
    count(*)
  into v_members, v_host, v_count
  from public.pod_members m
  where m.pod_id = v_pod.id;

  return jsonb_build_object(
    'slug', v_pod.slug,
    'name', v_pod.name,
    'host_name', v_host,
    'members', v_members,
    'full', v_count >= 4,
    'is_member', exists (select 1 from public.pod_members m where m.pod_id = v_pod.id and m.user_id = v_uid)
  );
end;
$$;

revoke execute on function public.pod_preview(text) from public, anon;
grant  execute on function public.pod_preview(text) to authenticated;

-- ─────────────────────────── join_pod

-- Takes a free seat, or updates your details if you're already seated.
-- If a session is running, you drop into it too.
create or replace function public.join_pod(
  p_slug         text,
  p_animal       text,
  p_display_name text,
  p_focus_text   text default '',
  p_tags         text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_pod     public.pods;
  v_display text := btrim(coalesce(p_display_name, ''));
  v_focus   text := btrim(coalesce(p_focus_text, ''));
  v_tags    text[] := coalesce(p_tags, '{}');
  v_count   int;
  v_session public.sessions;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_animal is null or p_animal not in ('bunny', 'cat', 'dog', 'koala') then raise exception 'invalid_animal'; end if;
  if char_length(v_display) not between 1 and 24 then raise exception 'invalid_display_name'; end if;
  if char_length(v_focus) > 80 then raise exception 'invalid_focus_text'; end if;
  if not public.tags_ok(v_tags) then raise exception 'invalid_tags'; end if;

  -- Locking the pod serialises two people reaching for the last seat, or the same pal.
  select * into v_pod from public.pods where slug = p_slug for update;
  if not found then raise exception 'pod_not_found'; end if;

  if exists (select 1 from public.pod_members where pod_id = v_pod.id and user_id = v_uid) then
    -- Already seated: keep the pal, update the rest.
    update public.pod_members
    set display_name = v_display, focus_text = v_focus, tags = v_tags
    where pod_id = v_pod.id and user_id = v_uid;
  else
    select count(*) into v_count from public.pod_members where pod_id = v_pod.id;
    if v_count >= 4 then raise exception 'pod_full'; end if;
    if exists (select 1 from public.pod_members where pod_id = v_pod.id and animal = p_animal) then
      raise exception 'pal_taken';
    end if;

    begin
      insert into public.pod_members (pod_id, user_id, display_name, animal, focus_text, tags)
      values (v_pod.id, v_uid, v_display, p_animal, v_focus, v_tags);
    exception when unique_violation then
      raise exception 'pal_taken';
    end;

    insert into public.profiles (id, name, animal)
    values (v_uid, v_display, p_animal)
    on conflict (id) do update set name = excluded.name, animal = excluded.animal;
  end if;

  -- A session is already running: take a seat at that table too, from now on.
  select * into v_session from public.sessions where pod_id = v_pod.id and ended_at is null;
  if found and now() < public.session_ends_at(v_session) then
    insert into public.session_members (session_id, user_id, focus_text)
    values (v_session.id, v_uid, v_focus)
    on conflict (session_id, user_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.join_pod(text, text, text, text, text[]) from public, anon;
grant  execute on function public.join_pod(text, text, text, text, text[]) to authenticated;

-- ─────────────────────────── live updates

-- Realtime sends row changes to members only, because row-level security still applies.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pod_members'
  ) then
    alter publication supabase_realtime add table public.pod_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
end;
$$;

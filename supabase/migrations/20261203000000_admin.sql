-- =============================================================================
-- Panel de administración
--
-- * admins: quién administra (el primero se da de alta desde el SQL Editor).
--   Un admin es también moderador del foro y miembro de la redacción.
-- * account_moderation: nota de verificación y suspensión de cada cuenta.
--   Tabla aparte porque profiles es legible por otros usuarios.
-- * Suspender una cuenta le quita TODOS los permisos (has_permission) y oculta
--   su perfil a los demás (can_view_profile): no puede escribir, publicar,
--   mandar mensajes ni aparecer en Move.
-- * Todo lo que hace un admin queda en admin_log.
-- =============================================================================

create table public.admins (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where profile_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.account_moderation (
  profile_id         uuid primary key references public.profiles (id) on delete cascade,
  verification_note  text check (verification_note is null or char_length(verification_note) <= 500),
  suspended_at       timestamptz,
  suspension_reason  text check (suspension_reason is null or char_length(suspension_reason) <= 500),
  updated_at         timestamptz not null default now()
);
alter table public.account_moderation enable row level security;
revoke all on public.account_moderation from anon, authenticated;
grant select on public.account_moderation to authenticated;
-- Cada uno ve su propia nota/suspensión (para explicárselo en su panel).
create policy "account_moderation: read own" on public.account_moderation
  for select to authenticated using (profile_id = (select auth.uid()));

create function public.is_suspended(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.account_moderation where profile_id = p_profile and suspended_at is not null);
$$;
revoke execute on function public.is_suspended(uuid) from public;
grant execute on function public.is_suspended(uuid) to anon, authenticated;

create table public.admin_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_log_recent on public.admin_log (created_at desc);
create index admin_log_target on public.admin_log (target_id, created_at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;

create function public.admin_require()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
end;
$$;

-- Permisos: una cuenta suspendida no tiene ninguno ----------------------------

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid()
      and rp.permission = p_permission
      and (not rp.requires_verification or p.verification_status = 'verified')
      and not public.is_suspended(p.id)
  );
$$;

create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select rp.permission
  from public.profiles p
  join public.role_permissions rp on rp.role = p.role
  where p.id = auth.uid()
    and (not rp.requires_verification or p.verification_status = 'verified')
    and not public.is_suspended(p.id)
  order by rp.permission;
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id
      and (
        p.id = auth.uid()
        or public.is_admin()
        or (not public.is_suspended(p.id) and (
              p.visibility = 'public'
              or (p.visibility = 'verified_only' and exists (
                    select 1 from public.profiles v
                    where v.id = auth.uid()
                      and v.role in ('club', 'professional')
                      and v.verification_status = 'verified'))))
      )
  );
$$;

-- Los admins moderan el foro y forman parte de la redacción.
create or replace function public.is_forum_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.forum_moderators where profile_id = auth.uid()) or public.is_admin();
$$;

create or replace function public.is_news_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.news_editors where profile_id = auth.uid()) or public.is_admin();
$$;

-- Resumen ----------------------------------------------------------------------

create function public.admin_stats()
returns table (
  users bigint, fans bigint, players bigint, professionals bigint, clubs bigint,
  pending_verifications bigint, suspended bigint, open_reports bigint, hidden_content bigint,
  news_drafts bigint, listings_active bigint, signups_7d bigint, messages_7d bigint, forum_posts_7d bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where role = 'fan'),
    (select count(*) from public.profiles where role = 'player'),
    (select count(*) from public.profiles where role = 'professional'),
    (select count(*) from public.profiles where role = 'club'),
    (select count(*) from public.profiles where verification_status = 'pending'),
    (select count(*) from public.account_moderation where suspended_at is not null),
    (select count(distinct coalesce(topic_id, post_id)) from public.forum_reports where resolved_at is null),
    (select count(*) from public.forum_topics where hidden) + (select count(*) from public.forum_posts where hidden),
    (select count(*) from public.news_articles where status = 'draft'),
    (select count(*) from public.listings where status = 'active' and expires_at > now()),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.messages where created_at > now() - interval '7 days'),
    (select count(*) from public.forum_topics where created_at > now() - interval '7 days')
      + (select count(*) from public.forum_posts where created_at > now() - interval '7 days');
end;
$$;

-- Usuarios ---------------------------------------------------------------------

create function public.admin_users(
  p_query  text default null,
  p_role   public.user_role default null,
  p_filter text default null,   -- pending | verified | rejected | suspended | staff
  p_limit  integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid, display_name text, email text, role public.user_role, country text,
  verification_status public.verification_status, suspended boolean, created_at timestamptz,
  last_sign_in_at timestamptz, is_admin boolean, is_editor boolean, is_moderator boolean, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
begin
  perform public.admin_require();
  return query
  select p.id, p.display_name, u.email::text, p.role, p.country::text, p.verification_status,
         coalesce(m.suspended_at is not null, false), p.created_at, u.last_sign_in_at,
         exists (select 1 from public.admins a where a.profile_id = p.id),
         exists (select 1 from public.news_editors e where e.profile_id = p.id),
         exists (select 1 from public.forum_moderators f where f.profile_id = p.id),
         count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.account_moderation m on m.profile_id = p.id
  where (v_q is null or p.display_name ilike '%' || v_q || '%' or u.email ilike '%' || v_q || '%' or p.id::text = v_q)
    and (p_role is null or p.role = p_role)
    and (p_filter is null
         or (p_filter in ('pending', 'verified', 'rejected') and p.verification_status::text = p_filter)
         or (p_filter = 'suspended' and m.suspended_at is not null)
         or (p_filter = 'staff' and (exists (select 1 from public.admins a where a.profile_id = p.id)
                                     or exists (select 1 from public.news_editors e where e.profile_id = p.id)
                                     or exists (select 1 from public.forum_moderators f where f.profile_id = p.id))))
  order by case when p_filter = 'pending' then p.created_at end asc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create function public.admin_user(p_id uuid)
returns table (
  id uuid, display_name text, email text, email_confirmed boolean, role public.user_role, country text, city text,
  visibility public.profile_visibility, verification_status public.verification_status, verification_note text,
  suspended_at timestamptz, suspension_reason text, created_at timestamptz, last_sign_in_at timestamptz,
  is_admin boolean, is_editor boolean, is_moderator boolean, forum_alias text,
  listings bigint, forum_posts bigint, messages_sent bigint, reports_received bigint,
  club_name text, club_league text, club_website text, club_founded integer,
  professional_type public.professional_type, current_entity text, years_experience integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select p.id, p.display_name, u.email::text, u.email_confirmed_at is not null, p.role, p.country::text, p.city,
         p.visibility, p.verification_status, m.verification_note, m.suspended_at, m.suspension_reason,
         p.created_at, u.last_sign_in_at,
         exists (select 1 from public.admins a where a.profile_id = p.id),
         exists (select 1 from public.news_editors e where e.profile_id = p.id),
         exists (select 1 from public.forum_moderators f where f.profile_id = p.id),
         fi.alias,
         (select count(*) from public.listings l where l.owner_id = p.id),
         (select count(*) from public.forum_topics t where t.author_id = p.id) + (select count(*) from public.forum_posts fp where fp.author_id = p.id),
         (select count(*) from public.messages ms where ms.sender_id = p.id),
         (select count(*) from public.forum_reports r
            left join public.forum_topics rt on rt.id = r.topic_id
            left join public.forum_posts rp on rp.id = r.post_id
           where coalesce(rt.author_id, rp.author_id) = p.id),
         c.name, c.league, c.website, c.founded_year::integer,
         pr.professional_type, pr.current_entity, pr.years_experience::integer
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.account_moderation m on m.profile_id = p.id
  left join public.forum_identities fi on fi.profile_id = p.id
  left join public.clubs c on c.owner_id = p.id
  left join public.professional_profiles pr on pr.profile_id = p.id
  where p.id = p_id;
end;
$$;

create function public.admin_set_verification(p_id uuid, p_status public.verification_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_old public.verification_status;
begin
  perform public.admin_require();
  select role, verification_status into v_role, v_old from public.profiles where id = p_id;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if v_role not in ('professional', 'club') or p_status = 'not_required' then
    raise exception 'not applicable' using errcode = '22023';
  end if;
  update public.profiles set verification_status = p_status where id = p_id;
  insert into public.account_moderation (profile_id, verification_note)
  values (p_id, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  on conflict (profile_id) do update set verification_note = excluded.verification_note, updated_at = now();
  insert into public.admin_log (actor_id, action, target_id, details)
  values (auth.uid(), 'verification', p_id, jsonb_build_object('from', v_old, 'to', p_status, 'note', p_note));
end;
$$;

create function public.admin_set_suspended(p_id uuid, p_suspended boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if p_id = auth.uid() then raise exception 'cannot suspend yourself' using errcode = '22023', hint = 'self'; end if;
  if p_suspended and exists (select 1 from public.admins where profile_id = p_id) then
    raise exception 'cannot suspend an admin' using errcode = '22023', hint = 'admin';
  end if;
  insert into public.account_moderation (profile_id, suspended_at, suspension_reason)
  values (p_id, case when p_suspended then now() end, case when p_suspended then nullif(left(btrim(coalesce(p_reason, '')), 500), '') end)
  on conflict (profile_id) do update
    set suspended_at = case when p_suspended then coalesce(public.account_moderation.suspended_at, now()) end,
        suspension_reason = case when p_suspended then excluded.suspension_reason end,
        updated_at = now();
  insert into public.admin_log (actor_id, action, target_id, details)
  values (auth.uid(), case when p_suspended then 'suspend' else 'unsuspend' end, p_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- Equipo: admin, redacción, moderación del foro.
create function public.admin_set_staff(p_id uuid, p_role text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'not found' using errcode = 'P0002'; end if;
  if p_role = 'admin' then
    if p_on then
      insert into public.admins (profile_id) values (p_id) on conflict do nothing;
    else
      if p_id = auth.uid() then raise exception 'cannot remove yourself' using errcode = '22023', hint = 'self'; end if;
      delete from public.admins where profile_id = p_id;
    end if;
  elsif p_role = 'editor' then
    if p_on then insert into public.news_editors (profile_id) values (p_id) on conflict do nothing;
    else delete from public.news_editors where profile_id = p_id; end if;
  elsif p_role = 'moderator' then
    if p_on then insert into public.forum_moderators (profile_id) values (p_id) on conflict do nothing;
    else delete from public.forum_moderators where profile_id = p_id; end if;
  else
    raise exception 'bad role' using errcode = '22023';
  end if;
  insert into public.admin_log (actor_id, action, target_id, details)
  values (auth.uid(), 'staff', p_id, jsonb_build_object('role', p_role, 'on', p_on));
end;
$$;

-- Denuncias del foro ------------------------------------------------------------

create function public.admin_reports(p_resolved boolean default false, p_limit integer default 50)
returns table (
  topic_id uuid, post_id uuid, thread_id uuid, thread_title text, body text,
  author_id uuid, author_alias text, hidden boolean, hidden_reason text,
  reports bigint, reasons text[], notes text[], last_reported_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select r.topic_id, r.post_id, coalesce(t.id, pt.id), coalesce(t.title, pt.title),
         left(coalesce(t.body, p.body), 600),
         coalesce(t.author_id, p.author_id), fi.alias,
         coalesce(t.hidden, p.hidden), coalesce(t.hidden_reason, p.hidden_reason),
         count(*), array_agg(distinct r.reason::text), array_remove(array_agg(r.note), null), max(r.created_at)
  from public.forum_reports r
  left join public.forum_topics t on t.id = r.topic_id
  left join public.forum_posts p on p.id = r.post_id
  left join public.forum_topics pt on pt.id = p.topic_id
  left join public.forum_identities fi on fi.profile_id = coalesce(t.author_id, p.author_id)
  where (r.resolved_at is null) = not coalesce(p_resolved, false)
  group by r.topic_id, r.post_id, t.id, pt.id, t.title, pt.title, t.body, p.body, t.author_id, p.author_id, fi.alias,
           t.hidden, p.hidden, t.hidden_reason, p.hidden_reason
  order by max(r.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- dismiss: el contenido es correcto (se restaura si estaba oculto); hide: se retira.
create function public.admin_resolve_reports(p_topic uuid, p_post uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if (p_topic is null) = (p_post is null) then raise exception 'one target' using errcode = '22023'; end if;
  if p_action = 'dismiss' then
    perform public.forum_moderate('restore', p_topic, p_post);
  elsif p_action = 'hide' then
    perform public.forum_moderate('hide', p_topic, p_post);
  else
    raise exception 'bad action' using errcode = '22023';
  end if;
  update public.forum_reports set resolved_at = now()
   where resolved_at is null and (topic_id = p_topic or post_id = p_post);
  insert into public.admin_log (actor_id, action, target_id, details)
  values (auth.uid(), 'report_' || p_action, coalesce(p_topic, p_post), jsonb_build_object('kind', case when p_topic is not null then 'topic' else 'post' end));
end;
$$;

create function public.admin_log_list(p_target uuid default null, p_limit integer default 100)
returns table (id bigint, actor_name text, action text, target_id uuid, target_name text, details jsonb, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select l.id, a.display_name, l.action, l.target_id, t.display_name, l.details, l.created_at
  from public.admin_log l
  left join public.profiles a on a.id = l.actor_id
  left join public.profiles t on t.id = l.target_id
  where p_target is null or l.target_id = p_target
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_require()', 'public.admin_stats()',
    'public.admin_users(text, public.user_role, text, integer, integer)', 'public.admin_user(uuid)',
    'public.admin_set_verification(uuid, public.verification_status, text)',
    'public.admin_set_suspended(uuid, boolean, text)', 'public.admin_set_staff(uuid, text, boolean)',
    'public.admin_reports(boolean, integer)', 'public.admin_resolve_reports(uuid, uuid, text)',
    'public.admin_log_list(uuid, integer)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

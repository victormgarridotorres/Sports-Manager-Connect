-- =============================================================================
-- Fase 5: Comunidad (foro anónimo), denuncias y moderación
--
-- * En el foro NUNCA se muestra el nombre real ni la foto: cada usuario elige
--   un alias y un avatar neutro (forum_identities).
-- * Por eso las tablas del foro no se pueden leer directamente: todo pasa por
--   funciones security definer que devuelven alias/avatar y jamás author_id.
-- * Leer: permiso content.view. Escribir: permiso content.comment + alias.
-- * Denuncias: 3 denuncias de personas distintas ocultan el contenido hasta
--   que un moderador lo revise. Moderadores: tabla forum_moderators (se dan de
--   alta desde el panel de Supabase o, más adelante, desde el panel de admin).
-- =============================================================================

create type public.forum_category as enum
  ('transfers', 'tactics', 'rules', 'international', 'offtopic', 'introductions');

create type public.forum_report_reason as enum
  ('spam', 'abuse', 'personal_data', 'off_topic', 'other');

-- Identidad anónima -----------------------------------------------------------

create table public.forum_identities (
  profile_id  uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  alias       text not null
              check (alias ~ '^[^[:space:][:cntrl:]<>@/\\#%&?"''`]{3,24}$'),
  avatar      text not null default 'eagle'
              check (avatar in ('eagle', 'fox', 'wolf', 'lion', 'tiger', 'owl')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index forum_identities_alias_key on public.forum_identities (lower(alias));

create trigger forum_identities_updated_at before update on public.forum_identities
  for each row execute function public.set_updated_at();

alter table public.forum_identities enable row level security;
revoke all on public.forum_identities from anon, authenticated;
-- Cada uno solo ve y toca SU fila (ver el alias de otros = funciones de abajo).
grant select, insert (alias, avatar), update (alias, avatar) on public.forum_identities to authenticated;

create policy "forum_identities: own" on public.forum_identities
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "forum_identities: create own" on public.forum_identities
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and public.has_permission('content.comment'));
create policy "forum_identities: update own" on public.forum_identities
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create function public.forum_alias_available(p_alias text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.forum_identities
    where lower(alias) = lower(btrim(p_alias)) and profile_id <> auth.uid()
  );
$$;

-- Moderadores -----------------------------------------------------------------

create table public.forum_moderators (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.forum_moderators enable row level security;
revoke all on public.forum_moderators from anon, authenticated;

create function public.is_forum_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.forum_moderators where profile_id = auth.uid());
$$;

-- Temas, respuestas y denuncias ----------------------------------------------

create table public.forum_topics (
  id             uuid primary key default gen_random_uuid(),
  category       public.forum_category not null,
  -- Si la cuenta se borra, el tema queda como «usuario eliminado» (no se pierden las respuestas de otros).
  author_id      uuid references public.profiles (id) on delete set null,
  title          text not null check (char_length(btrim(title)) between 5 and 140),
  body           text not null check (char_length(btrim(body)) between 10 and 8000),
  created_at     timestamptz not null default now(),
  edited_at      timestamptz,
  last_post_at   timestamptz not null default now(),
  reply_count    integer not null default 0,
  locked         boolean not null default false,
  hidden         boolean not null default false,
  hidden_reason  text check (hidden_reason in ('reports', 'moderator')),
  report_count   integer not null default 0
);
create index forum_topics_recent on public.forum_topics (last_post_at desc) where not hidden;
create index forum_topics_category on public.forum_topics (category, last_post_at desc) where not hidden;
create index forum_topics_author on public.forum_topics (author_id, created_at desc);

create table public.forum_posts (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid not null references public.forum_topics (id) on delete cascade,
  author_id      uuid references public.profiles (id) on delete set null,
  body           text not null check (char_length(btrim(body)) between 1 and 8000),
  created_at     timestamptz not null default now(),
  edited_at      timestamptz,
  hidden         boolean not null default false,
  hidden_reason  text check (hidden_reason in ('reports', 'moderator')),
  report_count   integer not null default 0
);
create index forum_posts_topic on public.forum_posts (topic_id, created_at);
create index forum_posts_author on public.forum_posts (author_id, created_at desc);

create table public.forum_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  topic_id     uuid references public.forum_topics (id) on delete cascade,
  post_id      uuid references public.forum_posts (id) on delete cascade,
  reason       public.forum_report_reason not null,
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  check ((topic_id is null) <> (post_id is null))
);
create unique index forum_reports_topic_once on public.forum_reports (reporter_id, topic_id) where topic_id is not null;
create unique index forum_reports_post_once on public.forum_reports (reporter_id, post_id) where post_id is not null;
create index forum_reports_open on public.forum_reports (created_at) where resolved_at is null;

alter table public.forum_topics  enable row level security;
alter table public.forum_posts   enable row level security;
alter table public.forum_reports enable row level security;
-- Sin acceso directo: todo por las funciones de abajo (así author_id nunca sale).
revoke all on public.forum_topics, public.forum_posts, public.forum_reports from anon, authenticated;

-- Contador de respuestas y última actividad -----------------------------------

create function public.forum_posts_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic uuid := coalesce(new.topic_id, old.topic_id);
begin
  update public.forum_topics t
     set reply_count  = (select count(*) from public.forum_posts p where p.topic_id = v_topic and not p.hidden),
         last_post_at = greatest(t.created_at, coalesce((select max(p.created_at) from public.forum_posts p where p.topic_id = v_topic and not p.hidden), t.created_at))
   where t.id = v_topic;
  return null;
end;
$$;

create trigger forum_posts_after_change
  after insert or delete or update of hidden on public.forum_posts
  for each row execute function public.forum_posts_after_change();

-- Lectura ---------------------------------------------------------------------

-- ¿Puedo ver este contenido? Visible, o es mío, o soy moderador.
create function public.forum_can_see(p_hidden boolean, p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not p_hidden or p_author = auth.uid() or public.is_forum_moderator();
$$;

-- Autores que yo he bloqueado (fase 4): no veo lo que escriben.
create function public.forum_blocked_by_me(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author is not null and exists (
    select 1 from public.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = p_author
  );
$$;

create function public.forum_category_stats()
returns table (category public.forum_category, topics bigint, posts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.category,
         count(t.id),
         coalesce(sum(t.reply_count), 0) + count(t.id)
  from unnest(enum_range(null::public.forum_category)) as c(category)
  left join public.forum_topics t on t.category = c.category and not t.hidden
  where public.has_permission('content.view')
  group by c.category
  order by array_position(enum_range(null::public.forum_category), c.category);
$$;

create function public.forum_list_topics(
  p_category public.forum_category default null,
  p_alias    text default null,
  p_limit    integer default 20,
  p_offset   integer default 0
)
returns table (
  id uuid, category public.forum_category, title text, excerpt text,
  author_alias text, author_avatar text, is_mine boolean,
  created_at timestamptz, last_post_at timestamptz, reply_count integer,
  locked boolean, hidden boolean, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.category, t.title, left(t.body, 180),
         i.alias, i.avatar, coalesce(t.author_id = auth.uid(), false),
         t.created_at, t.last_post_at, t.reply_count, t.locked, t.hidden,
         count(*) over ()
  from public.forum_topics t
  left join public.forum_identities i on i.profile_id = t.author_id
  where public.has_permission('content.view')
    and (p_category is null or t.category = p_category)
    and (p_alias is null or lower(i.alias) = lower(p_alias))
    -- En un perfil del foro solo se listan los temas visibles.
    and (case when p_alias is null then public.forum_can_see(t.hidden, t.author_id) else not t.hidden end)
    and not public.forum_blocked_by_me(t.author_id)
  order by t.last_post_at desc, t.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.forum_get_topic(p_id uuid)
returns table (
  id uuid, category public.forum_category, title text, body text,
  author_alias text, author_avatar text, is_mine boolean,
  created_at timestamptz, edited_at timestamptz, last_post_at timestamptz,
  reply_count integer, locked boolean, hidden boolean, hidden_reason text,
  reported_by_me boolean, can_reply boolean, is_moderator boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.category, t.title, t.body,
         i.alias, i.avatar, coalesce(t.author_id = auth.uid(), false),
         t.created_at, t.edited_at, t.last_post_at, t.reply_count, t.locked, t.hidden, t.hidden_reason,
         exists (select 1 from public.forum_reports r where r.topic_id = t.id and r.reporter_id = auth.uid()),
         (not t.locked and not t.hidden and public.has_permission('content.comment')),
         public.is_forum_moderator()
  from public.forum_topics t
  left join public.forum_identities i on i.profile_id = t.author_id
  where t.id = p_id
    and public.has_permission('content.view')
    and public.forum_can_see(t.hidden, t.author_id);
$$;

create function public.forum_get_posts(p_topic uuid, p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, body text, author_alias text, author_avatar text,
  is_mine boolean, is_op boolean, created_at timestamptz, edited_at timestamptz,
  hidden boolean, hidden_reason text, reported_by_me boolean, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.body, i.alias, i.avatar,
         coalesce(p.author_id = auth.uid(), false),
         coalesce(p.author_id = t.author_id, false),
         p.created_at, p.edited_at, p.hidden, p.hidden_reason,
         exists (select 1 from public.forum_reports r where r.post_id = p.id and r.reporter_id = auth.uid()),
         count(*) over ()
  from public.forum_posts p
  join public.forum_topics t on t.id = p.topic_id
  left join public.forum_identities i on i.profile_id = p.author_id
  where p.topic_id = p_topic
    and public.has_permission('content.view')
    and public.forum_can_see(t.hidden, t.author_id)
    and public.forum_can_see(p.hidden, p.author_id)
    and not public.forum_blocked_by_me(p.author_id)
  order by p.created_at, p.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Perfil público del foro: solo alias, avatar, rol y actividad (nunca nombre real).
create function public.forum_profile(p_alias text)
returns table (alias text, avatar text, role public.user_role, member_since timestamptz, topics bigint, replies bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select i.alias, i.avatar, pr.role, i.created_at,
         (select count(*) from public.forum_topics t where t.author_id = i.profile_id and not t.hidden),
         (select count(*) from public.forum_posts p where p.author_id = i.profile_id and not p.hidden),
         i.profile_id = auth.uid()
  from public.forum_identities i
  join public.profiles pr on pr.id = i.profile_id
  where lower(i.alias) = lower(btrim(p_alias))
    and public.has_permission('content.view');
$$;

-- Escritura -------------------------------------------------------------------

create function public.forum_require_writer()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('content.comment') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.forum_identities where profile_id = auth.uid()) then
    raise exception 'forum alias required' using errcode = 'P0001', hint = 'alias_required';
  end if;
end;
$$;

create function public.forum_create_topic(p_category public.forum_category, p_title text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.forum_require_writer();
  if (select count(*) from public.forum_topics
      where author_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate limited' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.forum_topics (category, author_id, title, body)
  values (p_category, auth.uid(), btrim(p_title), btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.forum_reply(p_topic uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.forum_require_writer();
  if not exists (select 1 from public.forum_topics where id = p_topic and not locked and not hidden) then
    raise exception 'topic closed' using errcode = 'P0001', hint = 'topic_closed';
  end if;
  if (select count(*) from public.forum_posts
      where author_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limited' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.forum_posts (topic_id, author_id, body)
  values (p_topic, auth.uid(), btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.forum_edit_topic(p_id uuid, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.forum_topics
     set title = btrim(p_title), body = btrim(p_body), edited_at = now()
   where id = p_id and author_id = auth.uid() and not (hidden and hidden_reason = 'moderator');
  if not found then raise exception 'not allowed' using errcode = '42501'; end if;
end;
$$;

create function public.forum_edit_post(p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.forum_posts
     set body = btrim(p_body), edited_at = now()
   where id = p_id and author_id = auth.uid() and not (hidden and hidden_reason = 'moderator');
  if not found then raise exception 'not allowed' using errcode = '42501'; end if;
end;
$$;

-- Un tema solo lo puede borrar su autor mientras nadie haya respondido
-- (para no hacer desaparecer las respuestas de otros); un moderador, siempre.
create function public.forum_delete_topic(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.forum_topics t
   where t.id = p_id
     and (public.is_forum_moderator()
          or (t.author_id = auth.uid()
              and not exists (select 1 from public.forum_posts p
                              where p.topic_id = t.id and p.author_id is distinct from auth.uid())));
  if not found then raise exception 'not allowed' using errcode = '42501', hint = 'has_replies'; end if;
end;
$$;

create function public.forum_delete_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.forum_posts
   where id = p_id and (author_id = auth.uid() or public.is_forum_moderator());
  if not found then raise exception 'not allowed' using errcode = '42501'; end if;
end;
$$;

-- Denuncias -------------------------------------------------------------------

create function public.forum_report(
  p_topic uuid default null,
  p_post uuid default null,
  p_reason public.forum_report_reason default 'other',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_count integer;
begin
  if auth.uid() is null or not public.has_permission('content.view') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (p_topic is null) = (p_post is null) then
    raise exception 'one target' using errcode = '22023';
  end if;
  if p_topic is not null then
    select author_id into v_author from public.forum_topics where id = p_topic and not hidden;
  else
    select p.author_id into v_author from public.forum_posts p
      join public.forum_topics t on t.id = p.topic_id
     where p.id = p_post and not p.hidden and not t.hidden;
  end if;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if v_author = auth.uid() then raise exception 'own content' using errcode = '42501'; end if;
  if (select count(*) from public.forum_reports
      where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate limited' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.forum_reports (reporter_id, topic_id, post_id, reason, note)
  values (auth.uid(), p_topic, p_post, p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  on conflict do nothing;
  if not found then return; end if;

  if p_topic is not null then
    update public.forum_topics set report_count = report_count + 1 where id = p_topic returning report_count into v_count;
    if v_count >= 3 then
      update public.forum_topics set hidden = true, hidden_reason = 'reports' where id = p_topic and not hidden;
    end if;
  else
    update public.forum_posts set report_count = report_count + 1 where id = p_post returning report_count into v_count;
    if v_count >= 3 then
      update public.forum_posts set hidden = true, hidden_reason = 'reports' where id = p_post and not hidden;
    end if;
  end if;
end;
$$;

-- Moderación: ocultar / restaurar / cerrar / reabrir (solo moderadores).
create function public.forum_moderate(p_action text, p_topic uuid default null, p_post uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_forum_moderator() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_topic is not null then
    case p_action
      when 'hide'    then update public.forum_topics set hidden = true, hidden_reason = 'moderator' where id = p_topic;
      when 'restore' then update public.forum_topics set hidden = false, hidden_reason = null, report_count = 0 where id = p_topic;
      when 'lock'    then update public.forum_topics set locked = true where id = p_topic;
      when 'unlock'  then update public.forum_topics set locked = false where id = p_topic;
      else raise exception 'bad action' using errcode = '22023';
    end case;
    if p_action in ('hide', 'restore') then
      update public.forum_reports set resolved_at = now() where topic_id = p_topic and resolved_at is null;
    end if;
  elsif p_post is not null then
    case p_action
      when 'hide'    then update public.forum_posts set hidden = true, hidden_reason = 'moderator' where id = p_post;
      when 'restore' then update public.forum_posts set hidden = false, hidden_reason = null, report_count = 0 where id = p_post;
      else raise exception 'bad action' using errcode = '22023';
    end case;
    update public.forum_reports set resolved_at = now() where post_id = p_post and resolved_at is null;
  else
    raise exception 'one target' using errcode = '22023';
  end if;
end;
$$;

-- Permisos de ejecución ---------------------------------------------------------

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.forum_alias_available(text)',
    'public.is_forum_moderator()',
    'public.forum_can_see(boolean, uuid)',
    'public.forum_blocked_by_me(uuid)',
    'public.forum_category_stats()',
    'public.forum_list_topics(public.forum_category, text, integer, integer)',
    'public.forum_get_topic(uuid)',
    'public.forum_get_posts(uuid, integer, integer)',
    'public.forum_profile(text)',
    'public.forum_require_writer()',
    'public.forum_create_topic(public.forum_category, text, text)',
    'public.forum_reply(uuid, text)',
    'public.forum_edit_topic(uuid, text, text)',
    'public.forum_edit_post(uuid, text)',
    'public.forum_delete_topic(uuid)',
    'public.forum_delete_post(uuid)',
    'public.forum_report(uuid, uuid, public.forum_report_reason, text)',
    'public.forum_moderate(text, uuid, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
revoke execute on function public.forum_posts_after_change() from public, anon, authenticated;

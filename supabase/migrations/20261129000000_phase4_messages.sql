-- Sports Manager Connect — Fase 4: Mensajes
-- ---------------------------------------------------------------------------
--  * Conversaciones 1:1 entre dos perfiles (par único), con contexto opcional
--    de un anuncio. Solo sus dos participantes ven la conversación y sus mensajes.
--  * Para EMPEZAR una conversación (can_message): permiso messages.send, poder ver
--    el perfil del otro, que el otro también pueda escribir, que acepte mensajes
--    nuevos y que ninguno haya bloqueado al otro.
--  * Para ENVIAR en una existente (can_send_in): ser participante, messages.send
--    y no estar bloqueados.
--  * Anti-spam: máx. 20 conversaciones nuevas al día y 60 mensajes por hora.
--  * Adjuntos (PDF/imagen, 5 MB) en un bucket PRIVADO: solo los participantes.
-- ---------------------------------------------------------------------------

-- 1. Preferencia "aceptar mensajes nuevos" y bloqueos ----------------------------

alter table public.account_private add column accept_messages boolean not null default true;
grant update (accept_messages) on public.account_private to authenticated;

create table public.user_blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
create policy "user_blocks: own" on public.user_blocks
  for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create trigger user_blocks_limit before insert on public.user_blocks
  for each row execute function public.enforce_row_limit('1000', 'blocker_id');

create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke execute on function public.is_blocked_between(uuid, uuid) from public;

-- 2. Conversaciones -------------------------------------------------------------

create table public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_low              uuid not null references public.profiles (id) on delete cascade,
  user_high             uuid not null references public.profiles (id) on delete cascade,
  listing_id            uuid references public.listings (id) on delete set null,
  created_by            uuid not null references public.profiles (id) on delete cascade,
  created_at            timestamptz not null default now(),
  last_message_at       timestamptz,
  last_message_preview  text,
  last_sender_id        uuid,
  low_read_at           timestamptz,
  high_read_at          timestamptz,
  check (user_low < user_high),
  unique (user_low, user_high)
);
create index conversations_low_idx on public.conversations (user_low, last_message_at desc);
create index conversations_high_idx on public.conversations (user_high, last_message_at desc);
create index conversations_creator_idx on public.conversations (created_by, created_at);

alter table public.conversations enable row level security;
revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;   -- se crean y actualizan solo vía funciones
create policy "conversations: participants" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (user_low, user_high));

create function public.is_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversations c
                 where c.id = p_conversation_id and auth.uid() in (c.user_low, c.user_high));
$$;
revoke execute on function public.is_participant(uuid) from public;
grant execute on function public.is_participant(uuid) to authenticated;

-- ¿Puedo EMPEZAR a escribir a esta persona?
create function public.can_message(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_other <> auth.uid()
    and public.has_permission('messages.send')
    and public.can_view_profile(p_other)
    and exists (  -- el destinatario también puede escribir (no se escribe a quien no puede responder)
      select 1 from public.profiles p
      join public.role_permissions rp on rp.role = p.role and rp.permission = 'messages.send'
      where p.id = p_other)
    and coalesce((select ap.accept_messages from public.account_private ap where ap.profile_id = p_other), true)
    and not public.is_blocked_between(auth.uid(), p_other);
$$;
revoke execute on function public.can_message(uuid) from public;
grant execute on function public.can_message(uuid) to authenticated;

-- ¿Puedo enviar en esta conversación?
create function public.can_send_in(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('messages.send') and exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.user_low, c.user_high)
      and not public.is_blocked_between(c.user_low, c.user_high));
$$;
revoke execute on function public.can_send_in(uuid) from public;
grant execute on function public.can_send_in(uuid) to authenticated;

-- Abre (o reutiliza) la conversación con otra persona. Devuelve su id.
create function public.start_conversation(p_other uuid, p_listing uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me    uuid := auth.uid();
  v_low   uuid;
  v_high  uuid;
  v_id    uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  v_low := least(v_me, p_other);
  v_high := greatest(v_me, p_other);

  select id into v_id from public.conversations where user_low = v_low and user_high = v_high;
  if v_id is not null then
    if p_listing is not null then
      update public.conversations set listing_id = p_listing where id = v_id;
    end if;
    return v_id;
  end if;

  if not public.can_message(p_other) then
    raise exception 'cannot_message' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.conversations
      where created_by = v_me and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  -- El anuncio de contexto tiene que ser uno que yo pueda ver.
  if p_listing is not null and not exists (
       select 1 from public.listings l
       where l.id = p_listing and (l.owner_id = v_me or (l.status = 'active' and public.can_view_profile(l.owner_id)))) then
    p_listing := null;
  end if;

  insert into public.conversations (user_low, user_high, listing_id, created_by)
  values (v_low, v_high, p_listing, v_me)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.start_conversation(uuid, uuid) from public;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- Marcar como leída (solo mi lado).
create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
     set low_read_at  = case when user_low  = auth.uid() then now() else low_read_at end,
         high_read_at = case when user_high = auth.uid() then now() else high_read_at end
   where id = p_conversation_id and auth.uid() in (user_low, user_high);
$$;
revoke execute on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Número de conversaciones con mensajes sin leer.
create function public.unread_conversations()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.conversations c
  where auth.uid() in (c.user_low, c.user_high)
    and c.last_sender_id is distinct from auth.uid()
    and c.last_message_at is not null
    and c.last_message_at > coalesce(case when c.user_low = auth.uid() then c.low_read_at else c.high_read_at end, '-infinity');
$$;
revoke execute on function public.unread_conversations() from public;
grant execute on function public.unread_conversations() to authenticated;

-- Mis conversaciones con los datos básicos de la otra persona.
-- (security definer: puedo ver el nombre de con quien hablo aunque luego haya
-- restringido su perfil; nunca expone más que nombre, foto y rol.)
create function public.list_conversations()
returns table (
  id                uuid,
  other_id          uuid,
  other_name        text,
  other_avatar      text,
  other_role        public.user_role,
  listing_id        uuid,
  listing_title     text,
  last_message_at   timestamptz,
  preview           text,
  last_from_me      boolean,
  unread            boolean,
  blocked           boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, o.id, o.display_name, o.avatar_path, o.role,
         c.listing_id, l.title,
         coalesce(c.last_message_at, c.created_at), c.last_message_preview,
         c.last_sender_id = auth.uid(),
         c.last_message_at is not null and c.last_sender_id is distinct from auth.uid()
           and c.last_message_at > coalesce(case when c.user_low = auth.uid() then c.low_read_at else c.high_read_at end, '-infinity'),
         public.is_blocked_between(c.user_low, c.user_high)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_low = auth.uid() then c.user_high else c.user_low end
  left join public.listings l on l.id = c.listing_id
  where auth.uid() in (c.user_low, c.user_high)
    and (c.last_message_at is not null or c.created_by = auth.uid())
  order by coalesce(c.last_message_at, c.created_at) desc
  limit 200;
$$;
revoke execute on function public.list_conversations() from public;
grant execute on function public.list_conversations() to authenticated;

-- 3. Mensajes ---------------------------------------------------------------------

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null default '' check (char_length(body) <= 4000),
  attachment_path  text,
  attachment_name  text check (char_length(attachment_name) <= 120),
  attachment_size  int check (attachment_size between 1 and 5242880),
  attachment_type  text check (attachment_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  created_at       timestamptz not null default now(),
  check (char_length(btrim(body)) > 0 or attachment_path is not null),
  -- el adjunto tiene que estar en la carpeta de ESTA conversación
  check (attachment_path is null or attachment_path ~ ('^' || conversation_id::text || '/[A-Za-z0-9._-]+$'))
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body, attachment_path, attachment_name, attachment_size, attachment_type)
  on public.messages to authenticated;

create policy "messages: participants read" on public.messages
  for select to authenticated using (public.is_participant(conversation_id));
create policy "messages: send" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_send_in(conversation_id));

-- Tras cada mensaje: actualizar la conversación (y anti-spam antes de insertar).
create function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  new.created_at := now();
  return new;
end;
$$;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(case when btrim(new.body) <> '' then new.body else '📎 ' || coalesce(new.attachment_name, '') end, 140),
         last_sender_id = new.sender_id,
         low_read_at  = case when user_low  = new.sender_id then new.created_at else low_read_at end,
         high_read_at = case when user_high = new.sender_id then new.created_at else high_read_at end
   where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Tiempo real (Supabase Realtime respeta la RLS de cada suscriptor).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 4. Adjuntos (bucket privado) ---------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-attachments', 'message-attachments', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Conversación a la que pertenece un fichero (carpeta = id). Null si no encaja,
-- para no romper nunca una consulta de Storage con un cast inválido.
create function public.conversation_of_path(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

create policy "message attachments: participants read" on storage.objects
  for select to authenticated
  using (bucket_id = 'message-attachments' and public.is_participant(public.conversation_of_path(name)));
create policy "message attachments: participants upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'message-attachments' and public.can_send_in(public.conversation_of_path(name)));

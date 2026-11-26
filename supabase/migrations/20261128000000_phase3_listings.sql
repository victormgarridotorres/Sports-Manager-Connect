-- Sports Manager Connect — Fase 3: Anuncios (tablón), candidaturas y guardados
-- ---------------------------------------------------------------------------
-- Quién publica qué (lo decide can_publish_listing, no la interfaz):
--   club_seeks             -> clubes con offers.publish (verificados)
--   player_available       -> jugadores con availability.publish
--   professional_available -> profesionales con availability.publish
--   agent_represents       -> profesionales de tipo "agente" con offers.publish (verificados)
-- Candidaturas: solo a anuncios "club_seeks" activos, con offers.apply.
-- Los anuncios se ven con las mismas reglas de visibilidad que el perfil de su autor
-- y caducan a los 90 días (se pueden renovar).
-- ---------------------------------------------------------------------------

-- 1. Permisos nuevos ------------------------------------------------------------

insert into public.role_permissions (role, permission, requires_verification) values
  ('player',       'availability.publish', false),
  ('professional', 'availability.publish', false),
  ('professional', 'offers.publish',       true);

-- 2. Tipos ------------------------------------------------------------------------

create type public.listing_type as enum (
  'club_seeks', 'player_available', 'professional_available', 'agent_represents'
);
create type public.listing_status as enum ('active', 'closed');
create type public.application_status as enum ('sent', 'shortlisted', 'rejected');

-- 3. Anuncios ---------------------------------------------------------------------

create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  type          public.listing_type not null,
  org_name      text not null check (char_length(org_name) between 2 and 120),
  title         text not null check (char_length(title) between 3 and 120),
  highlight     text check (char_length(highlight) <= 60),
  subtitle      text check (char_length(subtitle) <= 160),
  league        text check (char_length(league) <= 120),
  country       char(2) check (country ~ '^[A-Z]{2}$'),   -- null = internacional
  position      public.player_position,
  salary        text check (char_length(salary) <= 120),
  description   text not null check (char_length(description) between 20 and 4000),
  requirements  text check (char_length(requirements) <= 2000),
  benefits      text check (char_length(benefits) <= 2000),
  about         text check (char_length(about) <= 2000),
  status        public.listing_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '90 days')
);
create index listings_active_idx on public.listings (status, expires_at, created_at desc);
create index listings_owner_idx on public.listings (owner_id);
create index listings_type_country_idx on public.listings (type, country);

create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger listings_limit before insert on public.listings
  for each row execute function public.enforce_row_limit('20', 'owner_id');

-- ¿Puede el usuario actual publicar este tipo de anuncio?
create function public.can_publish_listing(p_type public.listing_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'club_seeks' then public.current_user_role() = 'club' and public.has_permission('offers.publish')
    when 'player_available' then public.current_user_role() = 'player' and public.has_permission('availability.publish')
    when 'professional_available' then public.current_user_role() = 'professional' and public.has_permission('availability.publish')
    when 'agent_represents' then public.current_user_role() = 'professional' and public.has_permission('offers.publish')
      and exists (select 1 from public.professional_profiles pp
                  where pp.profile_id = auth.uid() and pp.professional_type = 'agent')
    else false
  end;
$$;
revoke execute on function public.can_publish_listing(public.listing_type) from public;
grant execute on function public.can_publish_listing(public.listing_type) to authenticated;

alter table public.listings enable row level security;
revoke all on public.listings from anon, authenticated;
grant select, delete on public.listings to authenticated;
grant insert (owner_id, type, org_name, title, highlight, subtitle, league, country, position,
              salary, description, requirements, benefits, about)
  on public.listings to authenticated;
grant update (type, org_name, title, highlight, subtitle, league, country, position, salary,
              description, requirements, benefits, about, status, expires_at)
  on public.listings to authenticated;

create policy "listings: readable" on public.listings
  for select to authenticated
  using (owner_id = (select auth.uid())
         or (status = 'active' and expires_at > now() and public.can_view_profile(owner_id)));
create policy "listings: publish own" on public.listings
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.can_publish_listing(type));
create policy "listings: edit own" on public.listings
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.can_publish_listing(type)
              and expires_at <= now() + interval '90 days 1 minute');
create policy "listings: delete own" on public.listings
  for delete to authenticated using (owner_id = (select auth.uid()));

-- 4. Candidaturas -----------------------------------------------------------------

create table public.listing_applications (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  applicant_id  uuid not null references public.profiles (id) on delete cascade,
  message       text check (char_length(message) <= 1000),
  status        public.application_status not null default 'sent',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (listing_id, applicant_id)
);
create index listing_applications_applicant_idx on public.listing_applications (applicant_id);

create trigger listing_applications_set_updated_at before update on public.listing_applications
  for each row execute function public.set_updated_at();
create trigger listing_applications_limit before insert on public.listing_applications
  for each row execute function public.enforce_row_limit('200', 'applicant_id');

-- ¿Es mío el anuncio? (security definer: evita recursión de RLS entre tablas)
create function public.owns_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.listings l where l.id = p_listing_id and l.owner_id = auth.uid());
$$;
revoke execute on function public.owns_listing(uuid) from public;
grant execute on function public.owns_listing(uuid) to authenticated;

-- ¿Se puede uno postular a este anuncio?
create function public.can_apply_to_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('offers.apply') and exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and l.type = 'club_seeks'
      and l.status = 'active'
      and l.expires_at > now()
      and l.owner_id <> auth.uid()
      and public.can_view_profile(l.owner_id)
  );
$$;
revoke execute on function public.can_apply_to_listing(uuid) from public;
grant execute on function public.can_apply_to_listing(uuid) to authenticated;

alter table public.listing_applications enable row level security;
revoke all on public.listing_applications from anon, authenticated;
grant select, delete on public.listing_applications to authenticated;
grant insert (listing_id, applicant_id, message) on public.listing_applications to authenticated;
grant update (status) on public.listing_applications to authenticated;

create policy "applications: applicant or listing owner reads" on public.listing_applications
  for select to authenticated
  using (applicant_id = (select auth.uid()) or public.owns_listing(listing_id));
create policy "applications: apply" on public.listing_applications
  for insert to authenticated
  with check (applicant_id = (select auth.uid()) and public.can_apply_to_listing(listing_id));
-- Solo el autor del anuncio cambia el estado (y solo la columna status, por GRANT).
create policy "applications: owner updates status" on public.listing_applications
  for update to authenticated
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
-- El candidato puede retirar su candidatura.
create policy "applications: applicant withdraws" on public.listing_applications
  for delete to authenticated using (applicant_id = (select auth.uid()));

-- 5. Anuncios guardados -----------------------------------------------------------

create table public.listing_saves (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  listing_id  uuid not null references public.listings (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index listing_saves_listing_idx on public.listing_saves (listing_id);

alter table public.listing_saves enable row level security;
revoke all on public.listing_saves from anon, authenticated;
grant select, insert, delete on public.listing_saves to authenticated;
create policy "listing_saves: own" on public.listing_saves
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.listings l where l.id = listing_id));
create trigger listing_saves_limit before insert on public.listing_saves
  for each row execute function public.enforce_row_limit('500', 'user_id');

-- Interesados: personas distintas que guardaron o se postularon (solo el número).
create function public.listing_interest(p_listing_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from (
    select user_id from public.listing_saves where listing_id = p_listing_id
    union
    select applicant_id from public.listing_applications where listing_id = p_listing_id
  ) t;
$$;
revoke execute on function public.listing_interest(uuid) from public;
grant execute on function public.listing_interest(uuid) to authenticated;

-- 6. Búsqueda del tablón ----------------------------------------------------------

create function public.search_listings(
  p_query          text default null,
  p_country        text default null,          -- 'INT' = internacional
  p_types          public.listing_type[] default null,
  p_position       public.player_position default null,
  p_scope          text default 'board',       -- board | mine | saved | applied
  p_sort           text default 'recent',
  p_exclude        uuid default null,
  p_limit          int default 20,
  p_offset         int default 0
)
returns table (
  id               uuid,
  owner_id         uuid,
  type             public.listing_type,
  org_name         text,
  title            text,
  highlight        text,
  subtitle         text,
  league           text,
  country          text,
  "position"       public.player_position,
  salary           text,
  status           public.listing_status,
  created_at       timestamptz,
  expires_at       timestamptz,
  owner_name       text,
  owner_avatar     text,
  owner_verified   boolean,
  interest         int,
  applications     int,
  is_saved         boolean,
  my_application   public.application_status,
  total_count      bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_like text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  v_like := case when nullif(btrim(p_query), '') is null then null
    else '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  select
    l.id, l.owner_id, l.type, l.org_name, l.title, l.highlight, l.subtitle, l.league, l.country::text,
    l.position, l.salary, l.status, l.created_at, l.expires_at,
    p.display_name, p.avatar_path, p.verification_status = 'verified',
    public.listing_interest(l.id),
    case when l.owner_id = auth.uid()
      then (select count(*)::int from public.listing_applications a where a.listing_id = l.id) end,
    exists (select 1 from public.listing_saves s where s.listing_id = l.id and s.user_id = auth.uid()),
    (select a.status from public.listing_applications a where a.listing_id = l.id and a.applicant_id = auth.uid()),
    count(*) over ()
  from public.listings l
  join public.profiles p on p.id = l.owner_id
  where
    (case p_scope
       when 'mine' then l.owner_id = auth.uid()
       when 'saved' then exists (select 1 from public.listing_saves s where s.listing_id = l.id and s.user_id = auth.uid())
       when 'applied' then exists (select 1 from public.listing_applications a where a.listing_id = l.id and a.applicant_id = auth.uid())
       else l.status = 'active' and l.expires_at > now()
     end)
    and (p_exclude is null or l.id <> p_exclude)
    and (p_types is null or l.type = any (p_types))
    and (p_position is null or l.position = p_position)
    and (p_country is null or (p_country = 'INT' and l.country is null) or l.country = p_country)
    and (v_like is null or l.title ilike v_like or l.highlight ilike v_like or l.org_name ilike v_like
         or l.subtitle ilike v_like or l.league ilike v_like)
  order by
    case when p_sort = 'interest' then public.listing_interest(l.id) end desc nulls last,
    l.created_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;
revoke execute on function public.search_listings from public, anon;
grant execute on function public.search_listings to authenticated;

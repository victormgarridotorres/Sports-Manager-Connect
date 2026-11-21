-- Sports Manager Connect — perfiles, roles y permisos
-- ---------------------------------------------------------------------------
-- 4 tipos de perfil: fan (aficionado), player (jugador),
-- professional (profesional: entrenador, fisio, árbitro, agente…), club.
--
-- Reglas de seguridad clave:
--  * El rol se elige UNA vez en el registro (metadata de signUp) y lo copia el
--    trigger handle_new_user a public.profiles. Después nadie puede cambiarlo
--    desde el cliente (privilegios por columna + RLS).
--  * La app NUNCA debe autorizar leyendo user_metadata del JWT (el usuario
--    puede editarlo con auth.updateUser). La fuente de verdad es
--    public.profiles + public.role_permissions, vía public.has_permission().
--  * Profesionales y clubes empiezan con verification_status = 'pending'.
--    Los permisos marcados requires_verification sólo se activan cuando un
--    administrador (service_role) los verifica.
-- ---------------------------------------------------------------------------

-- Tipos ----------------------------------------------------------------------

create type public.user_role as enum ('fan', 'player', 'professional', 'club');

create type public.verification_status as enum (
  'not_required', 'pending', 'verified', 'rejected'
);

create type public.player_position as enum (
  'goalkeeper', 'left_wing', 'left_back', 'centre_back',
  'pivot', 'right_back', 'right_wing'
);

create type public.professional_type as enum (
  'coach', 'physio', 'psychologist', 'referee', 'agent', 'scout', 'analyst', 'other'
);

-- Perfil base (1:1 con auth.users) -----------------------------------------

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  role                 public.user_role not null,
  display_name         text not null check (char_length(display_name) between 2 and 80),
  country              char(2) check (country ~ '^[A-Z]{2}$'),
  preferred_locale     text not null default 'es'
                         check (preferred_locale in ('es', 'en', 'fr', 'de', 'pt')),
  verification_status  public.verification_status not null default 'not_required',
  -- RGPD: evidencia del consentimiento
  terms_accepted_at    timestamptz not null,
  privacy_accepted_at  timestamptz not null,
  -- Sólo mayores de edad (18+): confirmación expresa en el registro
  adult_confirmed_at   timestamptz not null,
  marketing_opt_in     boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público/base de cada cuenta. role y verification_status sólo los modifica el backend.';

-- Datos específicos por rol --------------------------------------------------

create table public.player_profiles (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  position    public.player_position,
  birth_year  smallint check (birth_year between 1900 and 2100),
  updated_at  timestamptz not null default now()
);

create table public.professional_profiles (
  profile_id         uuid primary key references public.profiles (id) on delete cascade,
  professional_type  public.professional_type,  -- se completa después del registro
  updated_at         timestamptz not null default now()
);

create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 120),
  country     char(2) check (country ~ '^[A-Z]{2}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Matriz de permisos ---------------------------------------------------------
-- Debe coincidir con src/lib/auth/permissions.ts (un test lo comprueba).

create table public.role_permissions (
  role                   public.user_role not null,
  permission             text not null,
  requires_verification  boolean not null default false,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission, requires_verification) values
  -- aficionado
  ('fan',          'content.view',                 false),
  ('fan',          'content.comment',              false),
  ('fan',          'profiles.follow',              false),
  ('fan',          'profile.edit_own',             false),
  -- jugador
  ('player',       'content.view',                 false),
  ('player',       'content.comment',              false),
  ('player',       'profiles.follow',              false),
  ('player',       'profile.edit_own',             false),
  ('player',       'player_cv.publish',            false),
  ('player',       'offers.apply',                 false),
  ('player',       'messages.send',                false),
  -- profesional
  ('professional', 'content.view',                 false),
  ('professional', 'content.comment',              false),
  ('professional', 'profiles.follow',              false),
  ('professional', 'profile.edit_own',             false),
  ('professional', 'professional_cv.publish',      false),
  ('professional', 'offers.apply',                 false),
  ('professional', 'messages.send',                false),
  ('professional', 'talent.search',                true),
  -- club
  ('club',         'content.view',                 false),
  ('club',         'content.comment',              false),
  ('club',         'profiles.follow',              false),
  ('club',         'profile.edit_own',             false),
  ('club',         'messages.send',                false),
  ('club',         'club.manage',                  false),
  ('club',         'club.roster.manage',           true),
  ('club',         'offers.publish',               true),
  ('club',         'talent.search',                true);

-- updated_at automático ------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger player_profiles_set_updated_at before update on public.player_profiles
  for each row execute function public.set_updated_at();
create trigger professional_profiles_set_updated_at before update on public.professional_profiles
  for each row execute function public.set_updated_at();
create trigger clubs_set_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();

-- Alta de usuario: auth.users -> profiles (+ tabla del rol) -----------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role      public.user_role;
  v_name      text  := nullif(btrim(meta ->> 'display_name'), '');
  v_country   text  := nullif(upper(btrim(meta ->> 'country')), '');
  v_locale    text  := coalesce(nullif(meta ->> 'preferred_locale', ''), 'es');
  v_status    public.verification_status;
begin
  -- Sin rol en la metadata -> fan. Un rol inválido hace fallar el alta (cast a enum).
  -- Ojo: los usuarios creados desde el panel de Supabase también necesitan
  -- terms_accepted/privacy_accepted/adult_confirmed en su metadata.
  v_role := coalesce(nullif(meta ->> 'role', ''), 'fan')::public.user_role;

  -- RGPD: sin consentimiento explícito no hay cuenta. La fecha la pone el
  -- servidor (no se acepta una marca de tiempo enviada por el cliente).
  if coalesce(meta ->> 'terms_accepted', '') <> 'true'
     or coalesce(meta ->> 'privacy_accepted', '') <> 'true' then
    raise exception 'terms_and_privacy_consent_required'
      using errcode = 'check_violation';
  end if;

  -- La plataforma es sólo para mayores de edad (18+).
  if coalesce(meta ->> 'adult_confirmed', '') <> 'true' then
    raise exception 'adult_confirmation_required'
      using errcode = 'check_violation';
  end if;

  if v_name is null then
    v_name := split_part(coalesce(new.email, 'user'), '@', 1);
  end if;

  if v_locale not in ('es', 'en', 'fr', 'de', 'pt') then
    v_locale := 'es';
  end if;

  v_status := case
    when v_role in ('professional', 'club') then 'pending'::public.verification_status
    else 'not_required'::public.verification_status
  end;

  insert into public.profiles (
    id, role, display_name, country, preferred_locale, verification_status,
    terms_accepted_at, privacy_accepted_at, adult_confirmed_at, marketing_opt_in
  ) values (
    new.id, v_role, v_name, v_country, v_locale, v_status,
    now(),
    now(),
    now(),
    coalesce(meta ->> 'marketing_opt_in', '') = 'true'
  );

  case v_role
    when 'player' then
      insert into public.player_profiles (profile_id, position)
      values (new.id, nullif(meta ->> 'player_position', '')::public.player_position);
    when 'professional' then
      insert into public.professional_profiles (profile_id, professional_type)
      values (new.id, nullif(meta ->> 'professional_type', '')::public.professional_type);
    when 'club' then
      insert into public.clubs (owner_id, name, country)
      values (new.id, v_name, v_country);
    else
      null;
  end case;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers de autorización ----------------------------------------------------

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ¿Tiene el usuario actual este permiso? Úsalo en políticas RLS:
--   using ( public.has_permission('offers.publish') )
create function public.has_permission(p_permission text)
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
  );
$$;

-- Permisos efectivos del usuario actual (para la UI).
create function public.my_permissions()
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
  order by rp.permission;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;

-- Row Level Security ---------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.player_profiles       enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.clubs                 enable row level security;
alter table public.role_permissions      enable row level security;

-- Privilegios por columna: el cliente NO puede tocar role, verification_status
-- ni las marcas de consentimiento. Las altas sólo las hace el trigger.
revoke all on public.profiles, public.player_profiles, public.professional_profiles,
              public.clubs, public.role_permissions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, country, preferred_locale, marketing_opt_in)
  on public.profiles to authenticated;

grant select on public.player_profiles to authenticated;
grant update (position, birth_year) on public.player_profiles to authenticated;

grant select on public.professional_profiles to authenticated;
grant update (professional_type) on public.professional_profiles to authenticated;

grant select on public.clubs to authenticated;
grant update (name, country) on public.clubs to authenticated;

grant select on public.role_permissions to anon, authenticated;

-- Por ahora cada usuario sólo ve su propio perfil. Los perfiles públicos
-- (jugadores, clubes…) se abrirán con políticas/vistas específicas más adelante.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "player_profiles: read own" on public.player_profiles
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "player_profiles: update own" on public.player_profiles
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "professional_profiles: read own" on public.professional_profiles
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "professional_profiles: update own" on public.professional_profiles
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "clubs: read own" on public.clubs
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "clubs: update own" on public.clubs
  for update to authenticated
  using (owner_id = (select auth.uid()) and public.has_permission('club.manage'))
  with check (owner_id = (select auth.uid()));

create policy "role_permissions: readable" on public.role_permissions
  for select to anon, authenticated using (true);

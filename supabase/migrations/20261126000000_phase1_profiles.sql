-- Sports Manager Connect — Fase 1: perfiles completos
-- ---------------------------------------------------------------------------
--  * Datos privados de la cuenta (consentimientos, marketing) a una tabla aparte
--    que sólo ve su dueño, para poder mostrar `profiles` públicamente.
--  * Visibilidad del perfil: público o sólo clubes/profesionales verificados.
--  * Datos deportivos de jugador, profesional y club; trayectoria; highlights
--    (sólo IDs de YouTube/Vimeo); plantilla del club; foto de perfil.
--  * Borrado de la cuenta por el propio usuario (RGPD).
-- ---------------------------------------------------------------------------

-- 1. Datos privados de la cuenta --------------------------------------------

create table public.account_private (
  profile_id           uuid primary key references public.profiles (id) on delete cascade,
  terms_accepted_at    timestamptz not null,
  privacy_accepted_at  timestamptz not null,
  adult_confirmed_at   timestamptz not null,
  marketing_opt_in     boolean not null default false,
  updated_at           timestamptz not null default now()
);

insert into public.account_private
  (profile_id, terms_accepted_at, privacy_accepted_at, adult_confirmed_at, marketing_opt_in)
select id, terms_accepted_at, privacy_accepted_at, adult_confirmed_at, marketing_opt_in
from public.profiles;

alter table public.profiles
  drop column terms_accepted_at,
  drop column privacy_accepted_at,
  drop column adult_confirmed_at,
  drop column marketing_opt_in;

create trigger account_private_set_updated_at before update on public.account_private
  for each row execute function public.set_updated_at();

alter table public.account_private enable row level security;
revoke all on public.account_private from anon, authenticated;
grant select on public.account_private to authenticated;
grant update (marketing_opt_in) on public.account_private to authenticated;

create policy "account_private: read own" on public.account_private
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "account_private: update own" on public.account_private
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- 2. Perfil base: datos comunes y visibilidad --------------------------------

create type public.profile_visibility as enum ('public', 'verified_only');

alter table public.profiles
  add column bio         text check (char_length(bio) <= 1500),
  add column city        text check (char_length(city) <= 80),
  add column languages   text[] not null default '{}'
    check (cardinality(languages) <= 10
           and array_to_string(languages, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'),
  add column avatar_path text,
  add column visibility  public.profile_visibility not null default 'public';

-- La foto sólo puede estar en la carpeta del propio usuario.
alter table public.profiles
  add constraint profiles_avatar_path_own_folder
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]+$'));

grant update (bio, city, languages, avatar_path, visibility) on public.profiles to authenticated;

-- 3. Jugador/a ---------------------------------------------------------------

create type public.defense_position as enum (
  'advanced', 'second_left', 'second_right', 'exterior_left', 'exterior_right', 'central'
);
create type public.dominant_hand as enum ('right', 'left');
create type public.availability as enum ('available_now', 'next_season', 'not_looking');

-- `position` (ya existente) es la posición principal de ataque.
alter table public.player_profiles
  add column secondary_position         public.player_position,
  add column defense_position           public.defense_position,
  add column secondary_defense_position public.defense_position,
  add column height_cm      smallint check (height_cm between 120 and 230),
  add column weight_kg      smallint check (weight_kg between 40 and 160),
  add column dominant_hand  public.dominant_hand,
  add column availability   public.availability,
  add column current_club   text check (char_length(current_club) <= 120),
  add column current_league text check (char_length(current_league) <= 120);

grant update (secondary_position, defense_position, secondary_defense_position, height_cm,
              weight_kg, dominant_hand, availability, current_club, current_league)
  on public.player_profiles to authenticated;

-- 4. Profesional --------------------------------------------------------------

alter type public.professional_type add value if not exists 'fitness_coach';
alter type public.professional_type add value if not exists 'nutritionist';

alter table public.professional_profiles
  add column years_experience smallint check (years_experience between 0 and 60),
  add column availability     public.availability,
  add column current_entity   text check (char_length(current_entity) <= 120),
  add column education        text check (char_length(education) <= 2000),
  add column achievements     text check (char_length(achievements) <= 2000);

grant update (years_experience, availability, current_entity, education, achievements)
  on public.professional_profiles to authenticated;

-- 5. Club ---------------------------------------------------------------------

alter table public.clubs
  add column description  text check (char_length(description) <= 2000),
  add column city         text check (char_length(city) <= 80),
  add column founded_year smallint check (founded_year between 1850 and 2100),
  add column league       text check (char_length(league) <= 120),
  add column venue        text check (char_length(venue) <= 120),
  add column website      text check (website ~ '^https?://[^\s]{3,200}$'),
  add column honours      text check (char_length(honours) <= 2000);

grant update (description, city, founded_year, league, venue, website, honours)
  on public.clubs to authenticated;

-- 6. Quién puede ver un perfil ------------------------------------------------

create function public.can_view_profile(p_profile_id uuid)
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
        or p.visibility = 'public'
        or (p.visibility = 'verified_only' and exists (
              select 1 from public.profiles v
              where v.id = auth.uid()
                and v.role in ('club', 'professional')
                and v.verification_status = 'verified'))
      )
  );
$$;

revoke execute on function public.can_view_profile(uuid) from public;
grant execute on function public.can_view_profile(uuid) to anon, authenticated;

-- Lectura pública según visibilidad (antes: sólo el propio perfil).
drop policy "profiles: read own" on public.profiles;
drop policy "player_profiles: read own" on public.player_profiles;
drop policy "professional_profiles: read own" on public.professional_profiles;
drop policy "clubs: read own" on public.clubs;

grant select on public.profiles, public.player_profiles,
                public.professional_profiles, public.clubs to anon;

create policy "profiles: readable" on public.profiles
  for select to anon, authenticated using (public.can_view_profile(id));
create policy "player_profiles: readable" on public.player_profiles
  for select to anon, authenticated using (public.can_view_profile(profile_id));
create policy "professional_profiles: readable" on public.professional_profiles
  for select to anon, authenticated using (public.can_view_profile(profile_id));
create policy "clubs: readable" on public.clubs
  for select to anon, authenticated using (public.can_view_profile(owner_id));

-- 7. Trayectoria (jugadores y profesionales) ----------------------------------

create table public.career_entries (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  start_year    smallint not null check (start_year between 1950 and 2100),
  end_year      smallint check (end_year between 1950 and 2100),
  organization  text not null check (char_length(organization) between 2 and 120),
  detail        text check (char_length(detail) <= 160),
  created_at    timestamptz not null default now(),
  check (end_year is null or end_year >= start_year)
);
create index career_entries_profile_idx on public.career_entries (profile_id, start_year desc);

-- 8. Highlights: sólo vídeos de YouTube o Vimeo (se guarda el ID, no la URL) ---

create type public.video_provider as enum ('youtube', 'vimeo');

create table public.highlights (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  provider    public.video_provider not null,
  video_id    text not null,
  title       text check (char_length(title) <= 100),
  created_at  timestamptz not null default now(),
  check ((provider = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$')
      or (provider = 'vimeo' and video_id ~ '^[0-9]{6,12}$')),
  unique (profile_id, provider, video_id)
);
create index highlights_profile_idx on public.highlights (profile_id, created_at);

-- 9. Plantilla del club -------------------------------------------------------

create table public.club_roster (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references public.clubs (id) on delete cascade,
  player_name        text not null check (char_length(player_name) between 2 and 80),
  position           public.player_position,
  shirt_number       smallint check (shirt_number between 0 and 99),
  player_profile_id  uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index club_roster_club_idx on public.club_roster (club_id);

-- 10. Límites por usuario (evitan abusos) -------------------------------------

create function public.enforce_row_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max   int := tg_argv[0]::int;
  v_col   text := tg_argv[1];
  v_owner uuid;
  v_count int;
begin
  v_owner := (to_jsonb(new) ->> v_col)::uuid;
  execute format('select count(*) from %I.%I where %I = $1', tg_table_schema, tg_table_name, v_col)
    into v_count using v_owner;
  if v_count >= v_max then
    raise exception 'row_limit_reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger career_entries_limit before insert on public.career_entries
  for each row execute function public.enforce_row_limit('30', 'profile_id');
create trigger highlights_limit before insert on public.highlights
  for each row execute function public.enforce_row_limit('10', 'profile_id');
create trigger club_roster_limit before insert on public.club_roster
  for each row execute function public.enforce_row_limit('60', 'club_id');

-- 11. RLS de las tablas nuevas -------------------------------------------------

alter table public.career_entries enable row level security;
alter table public.highlights     enable row level security;
alter table public.club_roster    enable row level security;

revoke all on public.career_entries, public.highlights, public.club_roster from anon, authenticated;
grant select on public.career_entries, public.highlights, public.club_roster to anon, authenticated;
grant insert, update, delete on public.career_entries, public.highlights, public.club_roster to authenticated;

create policy "career_entries: readable" on public.career_entries
  for select to anon, authenticated using (public.can_view_profile(profile_id));
create policy "career_entries: owner writes" on public.career_entries
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid())
              and public.current_user_role() in ('player', 'professional'));

create policy "highlights: readable" on public.highlights
  for select to anon, authenticated using (public.can_view_profile(profile_id));
create policy "highlights: owner writes" on public.highlights
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid())
              and public.current_user_role() in ('player', 'professional'));

create policy "club_roster: readable" on public.club_roster
  for select to anon, authenticated
  using (exists (select 1 from public.clubs c where c.id = club_id and public.can_view_profile(c.owner_id)));
create policy "club_roster: owner writes" on public.club_roster
  for all to authenticated
  using (exists (select 1 from public.clubs c where c.id = club_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.clubs c where c.id = club_id and c.owner_id = (select auth.uid()))
              and public.has_permission('club.manage'));

-- 12. Alta de usuario: consentimientos a account_private -----------------------

create or replace function public.handle_new_user()
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
  -- Los usuarios creados desde el panel de Supabase también necesitan
  -- terms_accepted/privacy_accepted/adult_confirmed en su metadata.
  v_role := coalesce(nullif(meta ->> 'role', ''), 'fan')::public.user_role;

  if coalesce(meta ->> 'terms_accepted', '') <> 'true'
     or coalesce(meta ->> 'privacy_accepted', '') <> 'true' then
    raise exception 'terms_and_privacy_consent_required' using errcode = 'check_violation';
  end if;

  if coalesce(meta ->> 'adult_confirmed', '') <> 'true' then
    raise exception 'adult_confirmation_required' using errcode = 'check_violation';
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

  insert into public.profiles (id, role, display_name, country, preferred_locale, verification_status)
  values (new.id, v_role, v_name, v_country, v_locale, v_status);

  insert into public.account_private
    (profile_id, terms_accepted_at, privacy_accepted_at, adult_confirmed_at, marketing_opt_in)
  values (new.id, now(), now(), now(), coalesce(meta ->> 'marketing_opt_in', '') = 'true');

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

-- 13. Fotos de perfil (Supabase Storage) --------------------------------------
-- Bucket público de lectura (las fotos se sirven por URL). Cada usuario sólo
-- escribe en su carpeta <uid>/. Máx. 2 MB; JPEG, PNG o WebP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars: owner updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- 14. Eliminar mi cuenta (RGPD, derecho de supresión) ---------------------------
-- Borra el usuario de Auth; por cascada desaparecen perfil y todos sus datos.
-- La app borra antes sus ficheros de Storage (no se pueden borrar por SQL).

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

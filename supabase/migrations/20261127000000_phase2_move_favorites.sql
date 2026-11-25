-- Sports Manager Connect — Fase 2: Move (búsqueda) y Favoritos
-- ---------------------------------------------------------------------------
--  * favorites: perfiles que cada usuario sigue (la estrella / "Seguir").
--    Cada uno solo ve y gestiona los suyos; nadie puede ver quién sigue a quién.
--  * follower_count(): número de seguidores (sin revelar quiénes son).
--  * search_move(): búsqueda de Move. Se ejecuta con los permisos de quien busca
--    (SECURITY INVOKER), así que la visibilidad de los perfiles la decide la RLS.
--    Los filtros de ojeo (edad, altura, mano, disponibilidad) solo se aplican a
--    quien tiene el permiso talent.search (clubes y profesionales verificados).
-- ---------------------------------------------------------------------------

-- 1. Favoritos ----------------------------------------------------------------

create table public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, profile_id),
  check (user_id <> profile_id)
);
create index favorites_profile_idx on public.favorites (profile_id);

alter table public.favorites enable row level security;
revoke all on public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;

create policy "favorites: read own" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: add own" on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and public.has_permission('profiles.follow')
              and public.can_view_profile(profile_id));
create policy "favorites: remove own" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger favorites_limit before insert on public.favorites
  for each row execute function public.enforce_row_limit('500', 'user_id');

-- Número de seguidores de un perfil (solo el número; nunca quiénes).
create function public.follower_count(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.favorites where profile_id = p_profile_id;
$$;
revoke execute on function public.follower_count(uuid) from public;
grant execute on function public.follower_count(uuid) to authenticated;

-- 2. Índices para Move --------------------------------------------------------

create index profiles_role_country_idx on public.profiles (role, country);
create index player_profiles_position_idx on public.player_profiles (position);
create index player_profiles_defense_idx on public.player_profiles (defense_position);
create index professional_profiles_type_idx on public.professional_profiles (professional_type);

-- 3. Búsqueda de Move (y lista de Favoritos) --------------------------------------

create function public.search_move(
  p_role          public.user_role default null,
  p_country       text default null,
  p_query         text default null,
  p_positions     public.player_position[] default null,
  p_defense       public.defense_position[] default null,
  p_specialties   public.professional_type[] default null,
  p_league        text default null,
  -- filtros de ojeo (requieren talent.search)
  p_age_min       int default null,
  p_age_max       int default null,
  p_height_min    int default null,
  p_hand          public.dominant_hand default null,
  p_availability  public.availability[] default null,
  -- solo los perfiles que sigo (página Favoritos; ahí también salen aficionados)
  p_favorites_only boolean default false,
  p_sort          text default 'recent',
  p_limit         int default 20,
  p_offset        int default 0
)
returns table (
  id                  uuid,
  role                public.user_role,
  display_name        text,
  country             text,
  city                text,
  avatar_path         text,
  verification_status public.verification_status,
  created_at          timestamptz,
  "position"          public.player_position,
  defense_position    public.defense_position,
  birth_year          smallint,
  height_cm           smallint,
  weight_kg           smallint,
  dominant_hand       public.dominant_hand,
  availability        public.availability,
  current_club        text,
  current_league      text,
  professional_type   public.professional_type,
  years_experience    smallint,
  current_entity      text,
  club_league         text,
  founded_year        smallint,
  roster_count        int,
  followers           int,
  is_favorite         boolean,
  total_count         bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_scout   boolean := public.has_permission('talent.search');
  v_year    int := extract(year from now())::int;
  v_like    text;
  v_league  text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Búsqueda de texto: se escapan los comodines de LIKE.
  v_like := case when nullif(btrim(p_query), '') is null then null
    else '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  v_league := case when nullif(btrim(p_league), '') is null then null
    else '%' || replace(replace(replace(btrim(p_league), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  -- Sin permiso de ojeo, los filtros avanzados se ignoran.
  if not v_scout then
    p_age_min := null; p_age_max := null; p_height_min := null; p_hand := null; p_availability := null;
  end if;

  return query
  with base as (
    select
      p.id, p.role, p.display_name, p.country::text, p.city, p.avatar_path, p.verification_status, p.created_at,
      pl.position, pl.defense_position, pl.birth_year, pl.height_cm, pl.weight_kg, pl.dominant_hand,
      coalesce(pl.availability, pr.availability) as availability,
      pl.current_club, pl.current_league,
      pr.professional_type, pr.years_experience, pr.current_entity,
      c.league as club_league, c.founded_year,
      (select count(*)::int from public.club_roster r where r.club_id = c.id) as roster_count
    from public.profiles p
    left join public.player_profiles pl on pl.profile_id = p.id
    left join public.professional_profiles pr on pr.profile_id = p.id
    left join public.clubs c on c.owner_id = p.id
    where (p.role in ('player', 'professional', 'club') or (p_favorites_only and p.role = 'fan'))
      and (not p_favorites_only
           or exists (select 1 from public.favorites f where f.user_id = auth.uid() and f.profile_id = p.id))
      and (p_role is null or p.role = p_role)
      and (p_country is null or p.country = p_country)
      and (v_like is null or p.display_name ilike v_like
           or pl.current_club ilike v_like or pr.current_entity ilike v_like)
      and (p_positions is null or pl.position = any (p_positions) or pl.secondary_position = any (p_positions))
      and (p_defense is null or pl.defense_position = any (p_defense) or pl.secondary_defense_position = any (p_defense))
      and (p_specialties is null or pr.professional_type = any (p_specialties))
      and (v_league is null or pl.current_league ilike v_league or c.league ilike v_league)
      and (p_age_min is null or pl.birth_year <= v_year - p_age_min)
      and (p_age_max is null or pl.birth_year >= v_year - p_age_max)
      and (p_height_min is null or pl.height_cm >= p_height_min)
      and (p_hand is null or pl.dominant_hand = p_hand)
      and (p_availability is null or coalesce(pl.availability, pr.availability) = any (p_availability))
  )
  select
    b.*,
    public.follower_count(b.id) as followers,
    exists (select 1 from public.favorites f where f.user_id = auth.uid() and f.profile_id = b.id) as is_favorite,
    count(*) over () as total_count
  from base b
  order by
    case when p_sort = 'followers' then public.follower_count(b.id) end desc nulls last,
    case when p_sort = 'name' then b.display_name end asc,
    b.created_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.search_move from public, anon;
grant execute on function public.search_move to authenticated;

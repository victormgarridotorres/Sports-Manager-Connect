-- =============================================================================
-- Portada: datos públicos para la página de inicio (también sin sesión).
--
-- * home_stats(): solo cifras agregadas, ningún dato personal.
-- * home_new_members() / home_moves(): security INVOKER → se aplican las
--   mismas reglas de visibilidad que en el resto de la web (sin sesión solo
--   salen perfiles con visibilidad «pública»).
-- * home_listings(): adelanto de los últimos anuncios activos (el tablón
--   completo sigue siendo solo para miembros). Solo anuncios de perfiles
--   públicos, y sin descripción, salario ni datos de contacto.
-- =============================================================================

create function public.home_stats()
returns table (countries bigint, players bigint, professionals bigint, clubs bigint, verified bigint, available bigint, listings bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct country) from public.profiles where role <> 'fan' and country is not null),
    (select count(*) from public.profiles where role = 'player'),
    (select count(*) from public.profiles where role = 'professional'),
    (select count(*) from public.profiles where role = 'club'),
    (select count(*) from public.profiles where verification_status = 'verified'),
    (select count(*) from public.player_profiles where availability = 'available_now')
      + (select count(*) from public.professional_profiles where availability = 'available_now'),
    (select count(*) from public.listings where status = 'active' and expires_at > now());
$$;

create function public.home_new_members(p_limit integer default 4)
returns table (
  id uuid, role public.user_role, display_name text, country text, avatar_path text, created_at timestamptz,
  player_position public.player_position, current_club text, professional_type public.professional_type,
  current_entity text, club_league text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.country, p.avatar_path, p.created_at,
         pl.position, pl.current_club, pr.professional_type, pr.current_entity, c.league
  from public.profiles p
  left join public.player_profiles pl on pl.profile_id = p.id
  left join public.professional_profiles pr on pr.profile_id = p.id
  left join public.clubs c on c.owner_id = p.id
  where p.role <> 'fan'
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 4), 1), 12);
$$;

-- «Movimientos»: jugadores/as y profesionales que acaban de marcarse como
-- disponibles (o que han actualizado su situación), lo más reciente primero.
create function public.home_moves(p_limit integer default 5)
returns table (
  id uuid, role public.user_role, display_name text, country text, avatar_path text,
  player_position public.player_position, birth_year integer, professional_type public.professional_type,
  current_club text, availability public.availability, changed_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from (
    select p.id, p.role, p.display_name, p.country, p.avatar_path,
           pl.position, pl.birth_year::integer, null::public.professional_type,
           pl.current_club, pl.availability, pl.updated_at
    from public.player_profiles pl
    join public.profiles p on p.id = pl.profile_id
    where pl.availability in ('available_now', 'next_season')
    union all
    select p.id, p.role, p.display_name, p.country, p.avatar_path,
           null, null, pr.professional_type,
           pr.current_entity, pr.availability, pr.updated_at
    from public.professional_profiles pr
    join public.profiles p on p.id = pr.profile_id
    where pr.availability in ('available_now', 'next_season')
  ) m
  order by m.updated_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 12);
$$;

create function public.home_listings(p_limit integer default 5)
returns table (
  id uuid, type public.listing_type, org_name text, title text, highlight text, subtitle text,
  league text, country text, player_position public.player_position, created_at timestamptz, interest integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.type, l.org_name, l.title, l.highlight, l.subtitle, l.league, l.country::text, l.position,
         l.created_at, public.listing_interest(l.id)
  from public.listings l
  join public.profiles o on o.id = l.owner_id
  where l.status = 'active' and l.expires_at > now() and o.visibility = 'public'
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 10);
$$;

revoke execute on function public.home_stats(), public.home_new_members(integer),
  public.home_moves(integer), public.home_listings(integer) from public;
grant execute on function public.home_stats(), public.home_new_members(integer),
  public.home_moves(integer), public.home_listings(integer) to anon, authenticated;

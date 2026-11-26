-- =============================================================================
-- Fase 6: Noticias
--
-- * Noticias públicas (se leen sin sesión, también para Google).
-- * Dos tipos: «original» (escrita por la redacción, con cuerpo completo) y
--   «enlazada» (titular + resumen propio + enlace a la fuente original).
-- * Las enlazadas llegan como BORRADOR desde las fuentes RSS: una persona de
--   la redacción las revisa, reescribe el resumen y decide si se publican.
-- * Redacción = tabla news_editors (se da de alta desde Supabase o, más
--   adelante, desde el panel de administración).
-- =============================================================================

create type public.news_section as enum ('transfers', 'results', 'national_teams', 'opinion', 'other');
create type public.news_status as enum ('draft', 'published', 'discarded');

create table public.news_editors (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.news_editors enable row level security;
revoke all on public.news_editors from anon, authenticated;

create function public.is_news_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.news_editors where profile_id = auth.uid());
$$;
revoke execute on function public.is_news_editor() from public, anon;
grant execute on function public.is_news_editor() to authenticated;

-- Fuentes RSS -----------------------------------------------------------------

create table public.news_sources (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  feed_url         text not null unique check (feed_url ~ '^https?://' and char_length(feed_url) <= 500),
  site_url         text check (site_url is null or (site_url ~ '^https?://' and char_length(site_url) <= 500)),
  language         text not null default 'es' check (language ~ '^[a-z]{2}$'),
  country          text check (country is null or country ~ '^[A-Z]{2}$'),
  default_section  public.news_section not null default 'other',
  active           boolean not null default false,
  last_fetched_at  timestamptz,
  last_item_count  integer,
  last_error       text check (last_error is null or char_length(last_error) <= 300),
  created_at       timestamptz not null default now()
);
alter table public.news_sources enable row level security;
revoke all on public.news_sources from anon, authenticated;
grant select, insert, update, delete on public.news_sources to authenticated;
create policy "news_sources: editors" on public.news_sources
  for all to authenticated using (public.is_news_editor()) with check (public.is_news_editor());

-- Sugerencias iniciales: DESACTIVADAS. La redacción las prueba con «Probar»
-- y activa solo las que funcionen.
insert into public.news_sources (name, feed_url, site_url, language, country) values
  ('Handball Planet', 'https://handball-planet.com/feed/', 'https://handball-planet.com', 'en', null),
  ('Mundo Deportivo · Balonmano', 'https://www.mundodeportivo.com/feed/rss/balonmano', 'https://www.mundodeportivo.com', 'es', 'ES'),
  ('L''Équipe · Handball', 'https://www.lequipe.fr/rss/actu_rss_Hand.xml', 'https://www.lequipe.fr', 'fr', 'FR'),
  ('kicker · Handball', 'https://newsfeed.kicker.de/news/handball', 'https://www.kicker.de', 'de', 'DE'),
  ('Record · Andebol', 'https://www.record.pt/rss/modalidades/andebol', 'https://www.record.pt', 'pt', 'PT');

-- Noticias --------------------------------------------------------------------

create table public.news_articles (
  id                   uuid primary key default gen_random_uuid(),
  status               public.news_status not null default 'draft',
  section              public.news_section not null default 'other',
  country              text check (country is null or country ~ '^[A-Z]{2}$'),
  competition          text check (competition is null or char_length(competition) <= 60),
  language             text not null default 'es' check (language ~ '^[a-z]{2}$'),
  title                text not null check (char_length(btrim(title)) between 5 and 200),
  summary              text check (summary is null or char_length(summary) <= 700),
  body                 text check (body is null or char_length(body) <= 30000),
  author_name          text check (author_name is null or char_length(author_name) <= 80),
  source_id            uuid references public.news_sources (id) on delete set null,
  source_name          text check (source_name is null or char_length(source_name) <= 80),
  source_url           text unique check (source_url is null or (source_url ~ '^https?://' and char_length(source_url) <= 1000)),
  source_published_at  timestamptz,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles (id) on delete set null,
  reviewed_by          uuid references public.profiles (id) on delete set null,
  -- Para publicar hace falta un resumen y, o bien cuerpo propio, o bien enlace a la fuente.
  check (status <> 'published' or (char_length(btrim(coalesce(summary, ''))) >= 20
                                    and (char_length(btrim(coalesce(body, ''))) > 0 or source_url is not null)))
);
create index news_articles_public on public.news_articles (published_at desc) where status = 'published';
create index news_articles_drafts on public.news_articles (created_at desc) where status = 'draft';

create trigger news_articles_updated_at before update on public.news_articles
  for each row execute function public.set_updated_at();

create function public.news_articles_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;
create trigger news_articles_before_write before insert or update on public.news_articles
  for each row execute function public.news_articles_before_write();

alter table public.news_articles enable row level security;
revoke all on public.news_articles from anon, authenticated;
-- Quién escribió o revisó cada noticia no es público.
grant select (id, status, section, country, competition, language, title, summary, body, author_name,
              source_name, source_url, source_published_at, published_at, created_at, updated_at)
  on public.news_articles to anon, authenticated;
grant select (source_id) on public.news_articles to authenticated;
grant insert (status, section, country, competition, language, title, summary, body, author_name,
              source_id, source_name, source_url, source_published_at, published_at)
  on public.news_articles to authenticated;
grant update (status, section, country, competition, language, title, summary, body, author_name, published_at)
  on public.news_articles to authenticated;
grant delete on public.news_articles to authenticated;

create policy "news_articles: published are public" on public.news_articles
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "news_articles: editors read all" on public.news_articles
  for select to authenticated using (public.is_news_editor());
create policy "news_articles: editors insert" on public.news_articles
  for insert to authenticated with check (public.is_news_editor());
create policy "news_articles: editors update" on public.news_articles
  for update to authenticated using (public.is_news_editor()) with check (public.is_news_editor());
create policy "news_articles: editors delete" on public.news_articles
  for delete to authenticated using (public.is_news_editor());

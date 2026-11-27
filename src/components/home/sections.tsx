import Link from "next/link";
import { partners } from "@/content/partners";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { homeListings, homeMoves, homeStats, newMembers, type HomeMove, type NewMember } from "@/lib/home/queries";
import { listingAccent } from "@/lib/listings/options";
import { latestNews } from "@/lib/news/public";
import { countryFlag, countryName } from "@/lib/profile/display";
import { Avatar } from "../profile/avatar";
import { RelativeTime } from "../relative-time";
import { NewsCarousel, OfferCarousel } from "./carousel";

type P = { locale: Locale; dict: Messages };

/* Cifras reales. Mientras la comunidad es pequeña se muestran datos de la
   plataforma en vez de números bajos (nunca cifras inventadas). */
const STATS_MIN_PROFILES = 100;

export async function HeroStats({ locale, dict }: P) {
  const h = dict.home.stats;
  const s = await homeStats();
  const profiles = s ? s.players + s.professionals + s.clubs : 0;
  const n = (v: number) => v.toLocaleString(locale);
  const items =
    s && profiles >= STATS_MIN_PROFILES
      ? [
          { v: n(s.countries), l: h.countries },
          { v: n(profiles), l: h.profiles },
          { v: n(s.clubs), l: h.clubs },
          { v: "5", l: h.languages },
        ]
      : [
          { v: "5", l: h.languages },
          { v: h.free, l: h.freeLabel },
          { v: "4", l: h.types },
          { v: "🇪🇺", l: h.gdpr },
        ];
  return (
    <div className="stats">
      {items.map((i) => (
        <div key={i.l} className="stat">
          <b>{i.v}</b>
          <span>{i.l}</span>
        </div>
      ))}
    </div>
  );
}

const memberLine = (m: Pick<NewMember, "role" | "player_position" | "current_club" | "professional_type" | "current_entity" | "club_league">, dict: Messages) => {
  const o = dict.options;
  if (m.role === "player") return [m.player_position ? o.positions[m.player_position] : dict.roles.player.name, m.current_club].filter(Boolean).join(" · ");
  if (m.role === "professional") return [m.professional_type ? o.professionalTypes[m.professional_type] : dict.roles.professional.name, m.current_entity].filter(Boolean).join(" · ");
  return [dict.roles.club.name, m.club_league].filter(Boolean).join(" · ");
};

/** Tarjeta de la cabecera: carrusel de noticias, teletipo y nuevos miembros. */
export async function HeroCard({ locale, dict }: P) {
  const h = dict.home;
  const [news, moves, listings, members, stats] = await Promise.all([latestNews(4), homeMoves(4), homeListings(3), newMembers(2), homeStats()]);
  const photos = ["/home/nc-g1.jpg", "/home/nc-g2.jpg", "/home/nc-g3.jpg"];
  const slides = news.length
    ? news.map((n, i) => (
        <Link key={n.id} href={`/${locale}/news/${n.id}`} className="absolute inset-0 block">
          <div className="nc-bg" style={{ backgroundImage: `url(${photos[i % photos.length]})` }} />
          <div className="nc-shade" />
          <div className="nc-content">
            <span className="nc-tag">{n.competition || dict.news.sections[n.section]}</span>
            <h4>{n.title}</h4>
            <div className="nc-meta">
              {n.country ? `${countryFlag(n.country)} ${countryName(n.country, locale)}` : `🌍 ${dict.news.global}`} · <RelativeTime iso={n.published_at} locale={locale} />
            </div>
          </div>
        </Link>
      ))
    : [
        <Link key="fallback" href={`/${locale}/news`} className="absolute inset-0 block">
          <div className="nc-bg" style={{ backgroundImage: `url(${photos[0]})` }} />
          <div className="nc-shade" />
          <div className="nc-content">
            <span className="nc-tag">{h.carousel.fallbackTag}</span>
            <h4>{h.carousel.fallbackTitle}</h4>
            <div className="nc-meta">{h.carousel.fallbackMeta}</div>
          </div>
        </Link>,
      ];

  // Teletipo con actividad real de la plataforma (y datos fijos de la web).
  const ticker: React.ReactNode[] = [
    ...moves.map((m) => (
      <>
        🔁 <b>{m.display_name}</b> · {m.availability === "available_now" ? h.moves.availableNow : h.moves.nextSeason}
      </>
    )),
    ...listings.map((l) => (
      <>
        📋 <b>{l.org_name}</b>: {[l.title, l.highlight].filter(Boolean).join(" ")}
      </>
    )),
  ];
  if (stats && stats.countries > 1) ticker.push(<>🌍 {format(h.ticker.countries, { n: stats.countries })}</>);
  ticker.push(<>🏆 {h.ticker.free}</>, <>💬 {h.ticker.languages}</>);

  return (
    <div className="hero-visual">
      <div className="hero-card">
        <NewsCarousel slides={slides} labels={h.carousel} />
        <div className="ticker-wrap" aria-label={h.ticker.label}>
          <div className="ticker-track">
            {ticker.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
            {ticker.map((t, i) => (
              <span key={`dup-${i}`} aria-hidden>
                {t}
              </span>
            ))}
          </div>
        </div>
        {members.length ? (
          <>
            <div className="hero-chips-head">
              <span className="dot-new" aria-hidden /> {h.newMembers}
            </div>
            <div className="hero-chips">
              {members.map((m) => (
                <Link key={m.id} href={`/${locale}/p/${m.id}`} className="profile-chip">
                  <Avatar path={m.avatar_path} name={m.display_name} size={40} className="rounded-full" />
                  <div className="meta">
                    <div className="name">
                      {m.display_name} {m.country ? <span aria-label={countryName(m.country, locale) ?? undefined}>{countryFlag(m.country)}</span> : null}
                    </div>
                    <div className="sub">
                      {memberLine(m, dict)} · <RelativeTime iso={m.created_at} locale={locale} />
                    </div>
                  </div>
                  <span className="pro-badge">{dict.roles[m.role].name}</span>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Discover · Connect · Move */
export function Journey({ dict }: { dict: Messages }) {
  const j = dict.home.journey;
  const icons = ["🔍", "✉️", "🔁"];
  return (
    <section id="que-es" className="journey-section" aria-labelledby="journey-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">{j.eyebrow}</span>
          <h2 id="journey-title">{j.title}</h2>
          <p>{j.lead}</p>
        </div>
        <div className="journey-grid">
          {j.steps.map((s, i) => (
            <div key={s.title} className="contents">
              {i > 0 ? <div className="journey-line" aria-hidden /> : null}
              <div className="journey-step">
                <span className="journey-num" aria-hidden>
                  0{i + 1}
                </span>
                <div className="journey-icon" aria-hidden>
                  {icons[i]}
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MoveItem({ m, locale, dict }: { m: HomeMove; locale: Locale; dict: Messages }) {
  const h = dict.home.moves;
  const what = m.role === "player" ? (m.player_position ? dict.options.positions[m.player_position] : dict.roles.player.name) : m.professional_type ? dict.options.professionalTypes[m.professional_type] : dict.roles.professional.name;
  return (
    <Link href={`/${locale}/p/${m.id}`} className="move-item">
      <Avatar path={m.avatar_path} name={m.display_name} size={44} className="move-avatar" />
      <div className="move-info">
        <p className="move-name">
          {m.display_name} {m.country ? <span aria-label={countryName(m.country, locale) ?? undefined}>{countryFlag(m.country)}</span> : null}
        </p>
        <p className="move-pos">{what}</p>
        <p className="move-transfer">
          <span className="club-out">
            <span className="move-club-name">{m.current_club || h.noClub}</span>
          </span>
          <span className="move-arrow" aria-hidden>
            →
          </span>
          <span className="club-new">
            <span className="move-club-name">{m.availability === "available_now" ? h.availableNow : h.nextSeason}</span>
          </span>
        </p>
      </div>
      <RelativeTime iso={m.changed_at} locale={locale} className="move-time" />
    </Link>
  );
}

/** Últimos movimientos: quién se acaba de poner disponible. */
export async function Moves({ locale, dict }: P) {
  const h = dict.home.moves;
  const [moves, s] = await Promise.all([homeMoves(5), homeStats()]);
  const big = !!s && s.players + s.professionals + s.clubs >= STATS_MIN_PROFILES;
  const panel = s && big
    ? [
        { l: h.panel.available, v: s.available },
        { l: h.panel.listings, v: s.listings },
        { l: h.panel.clubs, v: s.clubs },
        { l: h.panel.countries, v: s.countries },
      ]
    : [];
  return (
    <section id="tm-preview" aria-labelledby="moves-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Move</span>
          <h2 id="moves-title">{h.title}</h2>
          <p>{h.lead}</p>
        </div>
        <div className="move-layout">
          <div className="moves-feed">
            {moves.length ? (
              moves.map((m) => <MoveItem key={`${m.role}-${m.id}`} m={m} locale={locale} dict={dict} />)
            ) : (
              <p className="py-6 text-center text-[14px] text-[#c6c8d2]">{h.empty}</p>
            )}
            <Link href={`/${locale}/move`} className="moves-cta">
              {h.cta} →
            </Link>
          </div>
          <aside className="trend-panel">
            <h4>{panel.length ? h.panel.title : h.panel.joinTitle}</h4>
            {panel.length ? (
              <ul className="trend-list">
                {panel.map((x) => (
                  <li key={x.l}>
                    <span>{x.l}</span>
                    <b>{x.v.toLocaleString(locale)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] leading-relaxed text-[#c6c8d2]">{h.panel.joinText}</p>
            )}
            <Link href={`/${locale}/signup`} className="btn btn-gold btn-sm mt-5 w-full">
              {h.panel.cta}
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

const typeIcon = { club_seeks: "🏟️", player_available: "🤾", professional_available: "📋", agent_represents: "🤝" } as const;

/** Últimos anuncios (adelanto: el tablón completo es para miembros). */
export async function LatestListings({ locale, dict }: P) {
  const h = dict.home.listings;
  const l = dict.listings;
  const rows = await homeListings(5);
  const slides = rows.map((r) => (
    <Link key={r.id} href={`/${locale}/listings/${r.id}`} className="offer-feature">
      <div className="offer-feature-visual" aria-hidden>
        <span>{typeIcon[r.type]}</span>
      </div>
      <div className="offer-feature-body">
        <div className="offer-feature-top">
          <span className={`offer-type ${listingAccent[r.type]}`}>{l.types[r.type]}</span>
          <RelativeTime iso={r.created_at} locale={locale} className="when" />
        </div>
        <h3>
          {r.title} {r.highlight ? <em>{r.highlight}</em> : null}
        </h3>
        <p className="offer-feature-org">{[r.org_name, r.league, r.subtitle].filter(Boolean).join(" · ")}</p>
        <div className="offer-feature-tags">
          {r.player_position ? <span>{dict.options.positions[r.player_position]}</span> : null}
          <span>{r.country ? `${countryFlag(r.country)} ${countryName(r.country, locale)}` : `🌍 ${h.international}`}</span>
        </div>
        <div className="offer-feature-foot">
          {r.interest > 0 ? <span className="interest">🔥 {format(h.interested, { n: r.interest })}</span> : <span />}
          <span className="offer-feature-cta">{h.view} →</span>
        </div>
      </div>
    </Link>
  ));
  return (
    <section className="bg-paper-soft py-[88px]" aria-labelledby="listings-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">{h.eyebrow}</span>
          <h2 id="listings-title">{h.title}</h2>
          <p>{h.lead}</p>
        </div>
        {slides.length ? (
          <OfferCarousel slides={slides} labels={h.carousel} />
        ) : (
          <div className="card-box mx-auto max-w-[640px] text-center text-[14.5px] text-muted">{h.empty}</div>
        )}
        <div className="sec-cta">
          <Link href={`/${locale}/listings`} className="btn btn-dark">
            {h.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}

const leagues = [
  { code: "ES", league: "Liga ASOBAL", lang: "Español", img: "/home/gc1.jpg" },
  { code: "DE", league: "Handball-Bundesliga", lang: "Deutsch", img: "/home/gc2.jpg" },
  { code: "FR", league: "LNH Starligue", lang: "Français", img: "/home/gc3.jpg" },
  { code: "HU", league: "NB I", lang: "Magyar", img: "/home/gc4.jpg" },
  { code: "PL", league: "Superliga", lang: "Polski", img: "/home/gc5.jpg" },
  { code: "PT", league: "Andebol 1", lang: "Português", img: "/home/gc6.jpg" },
];

export function GlobalStrip({ locale, dict }: P) {
  const h = dict.home.global;
  return (
    <section className="global-strip" aria-labelledby="global-title">
      <div className="wrap">
        <div className="sec-head !max-w-[560px]">
          <span className="eyebrow !bg-[rgba(226,162,51,.15)] !text-gold">{h.eyebrow}</span>
          <h2 id="global-title">{h.title}</h2>
          <p>{h.lead}</p>
        </div>
        <div className="global-grid">
          {leagues.map((g) => (
            <Link key={g.code} href={`/${locale}/news?country=${g.code}`} style={{ backgroundImage: `url(${g.img})` }}>
              <div className="global-card-c">
                <div className="flagbig" aria-hidden>
                  {countryFlag(g.code)}
                </div>
                <b>{countryName(g.code, locale)}</b>
                <span>
                  {g.league} · {g.lang}
                </span>
                <span className="link-hint">{h.hint} →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function JoinCta({ locale, dict }: P) {
  const h = dict.home.joinBlock;
  return (
    <section className="cta-wrap">
      <div className="cta">
        <h2>{h.title}</h2>
        <p>{h.text}</p>
        <Link href={`/${locale}/signup`} className="btn btn-gold">
          {h.button}
        </Link>
      </div>
    </section>
  );
}

export function PartnersStrip({ locale, dict }: P) {
  const h = dict.home.partners;
  const tiles = (hidden: boolean) =>
    partners.map((p) => (
      <Link key={`${hidden}-${p.name}`} href={`/${locale}/partners`} className="sponsor-tile" aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined}>
        <span className="sponsor-tile-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- logos pequeños con proporciones distintas */}
          <img src={p.logo} alt="" />
        </span>
        <span className="sponsor-tile-name">{p.name}</span>
      </Link>
    ));
  return (
    <section className="sponsors-strip" aria-labelledby="partners-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow-dark">{h.eyebrow}</span>
          <h2 id="partners-title">{h.title}</h2>
          <p>{h.lead}</p>
        </div>
        <div className="sponsor-marquee">
          <div className="sponsor-track">
            {tiles(false)}
            {tiles(true)}
          </div>
        </div>
        <div className="sponsors-cta">
          <Link href={`/${locale}/partners`}>{h.cta} →</Link>
        </div>
      </div>
    </section>
  );
}

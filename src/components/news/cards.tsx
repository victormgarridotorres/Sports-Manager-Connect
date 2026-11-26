import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { sectionIcon, sectionTone } from "@/lib/news/options";
import type { NewsCard } from "@/lib/news/public";
import { countryFlag, countryName } from "@/lib/profile/display";

type T = Messages["news"];

export function newsDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
}

export function NewsTag({ n, t }: { n: Pick<NewsCard, "competition" | "section">; t: T }) {
  return <span className="news-tag">{n.competition || t.sections[n.section]}</span>;
}

export function NewsMeta({ n, locale, t }: { n: NewsCard; locale: Locale; t: T }) {
  const where = n.country ? `${countryFlag(n.country)} ${countryName(n.country, locale)}` : `🌍 ${t.global}`;
  const lang = n.language !== locale ? ` · ${n.language.toUpperCase()}` : "";
  return (
    <span className="news-meta">
      {where} · {newsDate(n.published_at, locale)}
      {n.source_name ? ` · ${n.source_name}` : ""}
      {lang}
    </span>
  );
}

const Art = ({ n, className = "" }: { n: NewsCard; className?: string }) => (
  <div aria-hidden className={`news-art ${sectionTone[n.section]} ${className}`}>
    {sectionIcon[n.section]}
  </div>
);

export function NewsLead({ n, locale, t }: { n: NewsCard; locale: Locale; t: T }) {
  return (
    <Link className="news-lead" href={`/${locale}/news/${n.id}`}>
      <Art n={n} />
      <div className="news-lead-c">
        <NewsTag n={n} t={t} />
        <h2>{n.title}</h2>
        {n.summary ? <p className="line-clamp-3">{n.summary}</p> : null}
        <NewsMeta n={n} locale={locale} t={t} />
      </div>
    </Link>
  );
}

export function NewsSublead({ n, locale, t }: { n: NewsCard; locale: Locale; t: T }) {
  return (
    <Link className="news-card" href={`/${locale}/news/${n.id}`}>
      <Art n={n} />
      <div className="news-c">
        <NewsTag n={n} t={t} />
        <h3>{n.title}</h3>
        <NewsMeta n={n} locale={locale} t={t} />
      </div>
    </Link>
  );
}

export function NewsRiverItem({ n, locale, t }: { n: NewsCard; locale: Locale; t: T }) {
  return (
    <Link className="news-river-item" href={`/${locale}/news/${n.id}`}>
      <Art n={n} className="news-river-thumb" />
      <div className="news-river-c">
        <NewsTag n={n} t={t} />
        <h3>{n.title}</h3>
        <NewsMeta n={n} locale={locale} t={t} />
      </div>
    </Link>
  );
}

export function NewsTicker({ items, locale, t }: { items: NewsCard[]; locale: Locale; t: T }) {
  if (!items.length) return null;
  // Se duplica la lista para que el desplazamiento sea continuo; la copia se oculta a lectores de pantalla.
  return (
    <div className="newsticker-bar">
      <div className="newsticker-badge">
        <i aria-hidden /> {t.breaking}
      </div>
      <div className="ticker-wrap">
        <div className="ticker-track">
          {items.map((n) => (
            <Link key={n.id} href={`/${locale}/news/${n.id}`}>
              {n.title}
            </Link>
          ))}
          {items.map((n) => (
            <Link key={`dup-${n.id}`} href={`/${locale}/news/${n.id}`} aria-hidden tabIndex={-1}>
              {n.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

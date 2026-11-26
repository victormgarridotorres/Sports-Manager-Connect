import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SimplePagination } from "@/components/listings/listing-filters";
import { NewsLead, NewsRiverItem, NewsSublead, NewsTicker } from "@/components/news/cards";
import { CountryFilter } from "@/components/news/country-filter";
import { EditorLink } from "@/components/news/editor-link";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { isNewsSection, NEWS_PAGE_SIZE, newsSections, type NewsSection } from "@/lib/news/options";
import { latestNews, listNews, newsCountries } from "@/lib/news/public";
import { countryFlag, countryName } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/news">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = (await getDictionary(locale)).news;
  return { title: t.crumb, description: t.lead };
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.news;
  const ticker = await latestNews(6);
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb }]} eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <NewsTicker items={ticker} locale={locale} t={t} />
      </SubHero>
      <PageBody>
        <div className="profile-layout">
          <div className="min-w-0">
            <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
              <Front locale={locale} dict={dict} searchParams={searchParams} />
            </Suspense>
          </div>
          <aside className="flex flex-col">
            <Suspense fallback={null}>
              <EditorLink locale={locale} label={t.editor.crumb} />
            </Suspense>
            <OpinionCard locale={locale} dict={dict} />
            <div className="side-card">
              <h4>{t.debateTitle}</h4>
              <p className="mb-3 text-[13px] text-muted">{t.debateText}</p>
              <Link href={`/${locale}/community`} className="btn btn-gold btn-sm">
                {t.debateCta}
              </Link>
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

async function OpinionCard({ locale, dict }: { locale: Locale; dict: Messages }) {
  const { rows } = await listNews({ section: "opinion" });
  if (!rows.length) return null;
  return (
    <div className="side-card">
      <h4>{dict.news.sections.opinion}</h4>
      {rows.slice(0, 4).map((n) => (
        <Link key={n.id} href={`/${locale}/news/${n.id}`} className="mini-news">
          <b className="italic">{n.title}</b>
          <span>{n.author_name ?? n.source_name ?? dict.news.newsroom}</span>
        </Link>
      ))}
    </div>
  );
}

async function Front({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const t = dict.news;
  const sp = await searchParams;
  const section: NewsSection | undefined = isNewsSection(sp.section) ? sp.section : undefined;
  const country = typeof sp.country === "string" && /^([A-Z]{2}|global)$/.test(sp.country) ? sp.country : undefined;
  const pageNum = Number(sp.page);
  const page = Number.isInteger(pageNum) && pageNum > 0 && pageNum < 1000 ? pageNum : 1;
  const [{ rows, total }, countries] = await Promise.all([listNews({ section, country, page }), newsCountries()]);

  const base = `/${locale}/news`;
  const href = (o: { section?: string; country?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (o.section) q.set("section", o.section);
    if (o.country) q.set("country", o.country);
    if (o.page && o.page > 1) q.set("page", String(o.page));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const countryOpts = [
    { value: "", label: t.allCountries },
    { value: "global", label: `🌍 ${t.global}` },
    ...countries.map((c) => ({ value: c, label: `${countryFlag(c)} ${countryName(c, locale)}` })).sort((a, b) => a.label.localeCompare(b.label, locale)),
  ];
  const hrefFor = Object.fromEntries(countryOpts.map((o) => [o.value, href({ section, country: o.value || undefined })]));
  const [lead, ...rest] = page === 1 ? rows : [];
  const sub = page === 1 ? rest.slice(0, 2) : [];
  const river = page === 1 ? rest.slice(2) : rows;

  return (
    <>
      <nav className="news-section-tabs" aria-label={t.sectionsLabel}>
        <Link href={href({ country })} className={`chip ${!section ? "active" : ""}`} aria-current={!section ? "page" : undefined}>
          {t.frontPage}
        </Link>
        {newsSections.map((s) => (
          <Link key={s} href={href({ section: s, country })} className={`chip ${section === s ? "active" : ""}`} aria-current={section === s ? "page" : undefined}>
            {t.sections[s]}
          </Link>
        ))}
      </nav>
      <div className="news-filter-bar">
        <CountryFilter value={country ?? ""} options={countryOpts} label={t.countryLabel} hrefFor={hrefFor} />
        <span className="count" aria-live="polite">
          {format(total === 1 ? t.countOne : t.count, { n: total })}
        </span>
      </div>
      {total === 0 ? (
        <div className="card-box flex flex-col items-start gap-2 text-[14px]">
          <p className="font-bold">{section || country ? t.emptyFiltered : t.empty}</p>
          <p className="text-muted">{t.emptyHint}</p>
        </div>
      ) : (
        <>
          {lead ? <NewsLead n={lead} locale={locale} t={t} /> : null}
          {sub.length ? (
            <div className="news-sublead-row">
              {sub.map((n) => (
                <NewsSublead key={n.id} n={n} locale={locale} t={t} />
              ))}
            </div>
          ) : null}
          {river.length ? (
            <div className="news-river">
              {river.map((n) => (
                <NewsRiverItem key={n.id} n={n} locale={locale} t={t} />
              ))}
            </div>
          ) : null}
          <SimplePagination hrefFor={(p) => href({ section, country, page: p })} page={page} total={total} pageSize={NEWS_PAGE_SIZE} t={dict.move} />
        </>
      )}
    </>
  );
}

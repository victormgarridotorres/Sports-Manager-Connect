import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/auth/form-ui";
import { newsDate } from "@/components/news/cards";
import { EditorLink } from "@/components/news/editor-link";
import { ShareButtons } from "@/components/news/share";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAccount } from "@/lib/auth/dal";
import { editorArticle, isNewsEditor } from "@/lib/news/editor";
import { paragraphs, readingMinutes } from "@/lib/news/options";
import { getNews, latestNews, type NewsArticle } from "@/lib/news/public";
import { countryFlag, countryName } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/news/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return {};
  const n = await getNews(id);
  if (!n) return { title: (await getDictionary(locale)).news.crumb };
  return {
    title: n.title,
    description: n.summary ?? undefined,
    openGraph: { title: n.title, description: n.summary ?? undefined, type: "article", publishedTime: n.published_at },
  };
}

export default function ArticlePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SubHero />}>
      <Loader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Loader({ params, searchParams }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  let article = await getNews(id);
  let preview = false;
  // Vista previa de borradores para la redacción.
  if (!article && (await getAccount()) && (await isNewsEditor())) {
    const draft = await editorArticle(id);
    if (draft) {
      article = { ...draft, published_at: draft.published_at ?? draft.created_at, updated_at: draft.created_at } as NewsArticle;
      preview = true;
    }
  }
  if (!article) return <Missing locale={locale} dict={dict} />;
  return <Article locale={locale} dict={dict} n={article} preview={preview} justPublished={!!sp.published} />;
}

function Missing({ locale, dict }: { locale: Locale; dict: Messages }) {
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.news.crumb, href: `/${locale}/news` }]} title={dict.news.notFoundTitle} />
      <PageBody narrow>
        <div className="card-box flex flex-col items-start gap-3 text-[14px]">
          <p className="text-muted">{dict.news.notFound}</p>
          <Link href={`/${locale}/news`} className="btn btn-gold btn-sm">
            {dict.news.backToNews}
          </Link>
        </div>
      </PageBody>
    </>
  );
}

async function Article({ locale, dict, n, preview, justPublished }: { locale: Locale; dict: Messages; n: NewsArticle; preview: boolean; justPublished: boolean }) {
  const t = dict.news;
  const more = (await latestNews(6)).filter((x) => x.id !== n.id).slice(0, 5);
  const where = n.country ? `${countryFlag(n.country)} ${countryName(n.country, locale)}` : `🌍 ${t.global}`;
  const body = paragraphs(n.body);
  const linked = !body.length && !!n.source_url;
  const minutes = readingMinutes(`${n.summary ?? ""} ${n.body ?? ""}`);
  const tag = n.competition || t.sections[n.section];
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb, href: `/${locale}/news` }, { label: n.title }]}>
        <span className="eyebrow-dark">{tag}</span>
        <h1 className="break-words">{n.title}</h1>
        <p className="!text-[14.5px]">
          {where} · {newsDate(n.published_at, locale)}
          {n.language !== locale ? ` · ${t.inLanguage} ${n.language.toUpperCase()}` : ""}
        </p>
        <div className="news-byline">
          <span>{t.by}</span> <b>{linked ? n.source_name : (n.author_name ?? t.newsroom)}</b>
          <span className="dot-sep" aria-hidden />
          <span>{format(t.readingTime, { n: minutes })}</span>
        </div>
      </SubHero>
      <PageBody>
        <div className="profile-layout">
          <article className="card-box news-body min-w-0">
            {preview ? <div className="mb-4"><Alert tone="warning">{t.previewDraft}</Alert></div> : null}
            {justPublished ? <div className="mb-4"><Alert tone="success">{t.editor.publishedOk}</Alert></div> : null}
            {n.summary ? <p className="news-standfirst">{n.summary}</p> : null}
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {n.source_url ? (
              <div className="news-source-box">
                <span>
                  {linked ? t.summaryNote : t.sourceLabel} <b className="text-ink">{n.source_name}</b>
                </span>
                <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm">
                  {t.readFull} ↗
                </a>
              </div>
            ) : null}
            <div className="news-topics">
              <Link href={`/${locale}/news?section=${n.section}`} className="news-topic-chip">
                {t.sections[n.section]}
              </Link>
              <Link href={`/${locale}/news?country=${n.country ?? "global"}`} className="news-topic-chip">
                {n.country ? countryName(n.country, locale) : t.global}
              </Link>
            </div>
          </article>
          <aside className="flex flex-col">
            <Suspense fallback={null}>
              <EditorLink locale={locale} label={t.editor.edit} articleId={n.id} />
            </Suspense>
            {more.length ? (
              <div className="side-card">
                <h4>{t.moreNews}</h4>
                {more.map((m) => (
                  <Link key={m.id} href={`/${locale}/news/${m.id}`} className="mini-news">
                    <b>{m.title}</b>
                    <span>
                      {m.country ? countryFlag(m.country) : "🌍"} {newsDate(m.published_at, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="side-card">
              <h4>{t.share}</h4>
              <ShareButtons title={n.title} labels={t.shareLabels} />
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/auth/form-ui";
import { newsDate } from "@/components/news/cards";
import { ImportButton } from "@/components/news/editor-forms";
import { EditorBody, EditorGate, EditorHero } from "@/components/news/editor-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { discardDrafts } from "@/lib/news/actions";
import { editorCounts, editorList, type EditorArticle } from "@/lib/news/editor";
import { countryFlag } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/news/editor">;
const tabs = ["draft", "published", "discarded"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).news.editor.crumb, robots: { index: false } };
}

export default async function EditorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <EditorHero locale={locale} dict={dict} />
      <EditorBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <EditorGate locale={locale} dict={dict} next={`/${locale}/news/editor`}>
            <Desk locale={locale} dict={dict} searchParams={searchParams} />
          </EditorGate>
        </Suspense>
      </EditorBody>
    </>
  );
}

async function Desk({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const t = dict.news.editor;
  const sp = await searchParams;
  const tab = tabs.find((x) => x === sp.tab) ?? "draft";
  const [counts, { rows }] = await Promise.all([editorCounts(), editorList(tab)]);
  const base = `/${locale}/news/editor`;
  return (
    <div className="flex flex-col gap-5">
      {sp.saved ? <Alert tone="success">{t.saved}</Alert> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[560px] text-[13.5px] text-on-dark">
          <p>{t.howItWorks}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">
          <ImportButton t={t} errors={dict.auth.errors} />
          <Link href={`${base}/new`} className="btn btn-ghost btn-sm">
            ✏️ {t.write}
          </Link>
          <Link href={`${base}/sources`} className="btn btn-ghost btn-sm">
            📡 {t.sources}
          </Link>
        </div>
      </div>

      <nav className="tabs !mb-0" aria-label={t.crumb}>
        {tabs.map((x) => (
          <Link key={x} href={`${base}?tab=${x}`} className={`tab ${x === tab ? "active" : ""}`} aria-current={x === tab ? "page" : undefined}>
            {t.tabs[x]} ({counts[x]})
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="card-box text-[14px] text-muted">{tab === "draft" ? t.noDrafts : t.empty}</div>
      ) : tab === "draft" ? (
        <form action={discardDrafts} className="card-box !py-2">
          <input type="hidden" name="locale" value={locale} />
          {rows.map((a) => (
            <Row key={a.id} a={a} locale={locale} dict={dict} selectable />
          ))}
          <div className="flex justify-end border-t border-line pt-3 pb-2">
            <button type="submit" className="btn btn-danger-outline btn-sm">
              {t.discardSelected}
            </button>
          </div>
        </form>
      ) : (
        <div className="card-box !py-2">
          {rows.map((a) => (
            <Row key={a.id} a={a} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ a, locale, dict, selectable }: { a: EditorArticle; locale: Locale; dict: Messages; selectable?: boolean }) {
  const t = dict.news.editor;
  const when = a.published_at ?? a.source_published_at ?? a.created_at;
  return (
    <div className="editor-row">
      {selectable ? (
        <input type="checkbox" name="ids" value={a.id} aria-label={format(t.selectRow, { title: a.title })} className="mt-1 size-4 flex-none accent-[var(--gold)]" />
      ) : null}
      <div className="min-w-0 flex-1">
        <h4>{a.title}</h4>
        <p>
          {a.source_name ? `📡 ${a.source_name} · ` : `✏️ ${t.original} · `}
          {dict.news.sections[a.section]} · {a.country ? countryFlag(a.country) : "🌍"} · {a.language.toUpperCase()} · {newsDate(when, locale)}
        </p>
        {a.summary ? <p className="mt-1 line-clamp-2">{a.summary}</p> : null}
      </div>
      <div className="flex flex-none flex-col items-end gap-2">
        <Link href={`/${locale}/news/editor/${a.id}`} className="btn btn-gold btn-sm">
          {a.status === "draft" ? t.review : t.edit}
        </Link>
        {a.status === "published" ? (
          <Link href={`/${locale}/news/${a.id}`} className="text-[12px] font-bold text-gold-deep">
            {t.view} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { newsDate } from "@/components/news/cards";
import { ImportButton, SourceForm, TestSourceButton } from "@/components/news/editor-forms";
import { EditorBody, EditorGate, EditorHero } from "@/components/news/editor-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { countryOptions } from "@/lib/countries";
import { deleteSource, setSourceActive } from "@/lib/news/actions";
import { listSources } from "@/lib/news/editor";
import { countryFlag } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/news/editor/sources">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).news.editor.sources, robots: { index: false } };
}

export default async function SourcesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <EditorHero locale={locale} dict={dict} current={dict.news.editor.sources} />
      <EditorBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <EditorGate locale={locale} dict={dict} next={`/${locale}/news/editor/sources`}>
            <Sources locale={locale} dict={dict} />
          </EditorGate>
        </Suspense>
      </EditorBody>
    </>
  );
}

async function Sources({ locale, dict }: { locale: Locale; dict: Messages }) {
  const t = dict.news.editor;
  const sources = await listSources();
  const countries = countryOptions(locale);
  const s = { t, sections: dict.news.sections, errors: dict.auth.errors, fe: dict.auth.fieldErrors };
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-5">
      <p className="text-[13.5px] text-on-dark">{t.sourcesLead}</p>
      <div className="card-box !py-2">
        {sources.length === 0 ? <p className="py-3 text-[14px] text-muted">{t.noSources}</p> : null}
        {sources.map((src) => (
          <div key={src.id} className="editor-row flex-wrap">
            <div className="min-w-0 flex-1">
              <h4>
                {src.name}{" "}
                <span className={`status-pill ${src.active ? (src.last_error ? "err" : "ok") : ""}`}>
                  {src.active ? (src.last_error ? t.sourceError : t.active) : t.inactive}
                </span>
              </h4>
              <p className="break-all">{src.feed_url}</p>
              <p>
                {src.country ? `${countryFlag(src.country)} ` : "🌍 "}
                {src.language.toUpperCase()} · {dict.news.sections[src.default_section]}
                {src.last_fetched_at ? ` · ${format(t.lastFetch, { date: newsDate(src.last_fetched_at, locale), n: src.last_item_count ?? 0 })}` : ` · ${t.neverFetched}`}
              </p>
              {src.last_error ? <p className="!text-danger">⚠️ {src.last_error}</p> : null}
            </div>
            <div className="flex flex-none flex-wrap items-start gap-2">
              <TestSourceButton sourceId={src.id} t={t} errors={dict.auth.errors} />
              <form action={setSourceActive}>
                <input type="hidden" name="sourceId" value={src.id} />
                <input type="hidden" name="active" value={src.active ? "0" : "1"} />
                <button type="submit" className={`btn btn-sm ${src.active ? "btn-ghost-light" : "btn-gold"}`}>
                  {src.active ? t.deactivate : t.activate}
                </button>
              </form>
              {src.active ? <ImportButton t={t} errors={dict.auth.errors} sourceId={src.id} label={`⬇️ ${t.importOne}`} /> : null}
            </div>
            <details className="w-full">
              <summary className="cursor-pointer text-[12.5px] font-bold text-muted">{t.editSource}</summary>
              <div className="mt-3 flex flex-col gap-3">
                <SourceForm source={src} countries={countries} s={s} />
                <form action={deleteSource}>
                  <input type="hidden" name="sourceId" value={src.id} />
                  <button type="submit" className="text-[12.5px] font-bold text-danger">
                    {t.deleteSource}
                  </button>
                </form>
              </div>
            </details>
          </div>
        ))}
      </div>
      <section className="card-box">
        <h3>{t.addSource}</h3>
        <SourceForm countries={countries} s={s} />
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleForm } from "@/components/news/editor-forms";
import { EditorBody, EditorGate, EditorHero } from "@/components/news/editor-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { countryOptions } from "@/lib/countries";
import { deleteArticle } from "@/lib/news/actions";
import { editorArticle } from "@/lib/news/editor";

type Props = PageProps<"/[locale]/news/editor/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).news.editor.crumb, robots: { index: false } };
}

export default function EditArticlePage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: Props["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <EditorHero locale={locale} dict={dict} current={dict.news.editor.review} />
      <EditorBody>
        <EditorGate locale={locale} dict={dict} next={`/${locale}/news/editor/${id}`}>
          <Edit locale={locale} dict={dict} id={id} />
        </EditorGate>
      </EditorBody>
    </>
  );
}

async function Edit({ locale, dict, id }: { locale: Locale; dict: Messages; id: string }) {
  const t = dict.news.editor;
  const article = await editorArticle(id);
  if (!article) {
    return (
      <div className="card-box flex flex-col items-start gap-3 text-[14px]">
        <p className="text-muted">{t.notFound}</p>
        <Link href={`/${locale}/news/editor`} className="btn btn-gold btn-sm">
          {t.backToDesk}
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      <p className="text-[13px] text-on-dark">
        {t.statusLabel}: <b className="text-white">{t.tabs[article.status]}</b>
      </p>
      <ArticleForm locale={locale} article={article} countries={countryOptions(locale)} s={{ t, sections: dict.news.sections, errors: dict.auth.errors, fe: dict.auth.fieldErrors }} />
      <details className="self-start">
        <summary className="btn btn-danger-outline btn-sm list-none [&::-webkit-details-marker]:hidden">{t.delete}</summary>
        <form action={deleteArticle} className="mt-2 flex flex-col items-start gap-2 rounded-[10px] border border-[#e0b4ac] bg-[#fdf5f4] p-3">
          <input type="hidden" name="id" value={article.id} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="tab" value={article.status} />
          <p className="text-[13px]">{t.deleteConfirm}</p>
          <button type="submit" className="btn btn-danger-outline btn-sm">
            {t.deleteFinal}
          </button>
        </form>
      </details>
    </div>
  );
}

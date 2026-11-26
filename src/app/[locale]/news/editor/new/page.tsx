import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleForm } from "@/components/news/editor-forms";
import { EditorBody, EditorGate, EditorHero } from "@/components/news/editor-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { countryOptions } from "@/lib/countries";

type Props = PageProps<"/[locale]/news/editor/new">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).news.editor.write, robots: { index: false } };
}

export default async function NewArticlePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <EditorHero locale={locale} dict={dict} current={dict.news.editor.write} />
      <EditorBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <EditorGate locale={locale} dict={dict} next={`/${locale}/news/editor/new`}>
            <div className="mx-auto max-w-[820px]">
              <ArticleForm locale={locale} countries={countryOptions(locale)} s={{ t: dict.news.editor, sections: dict.news.sections, errors: dict.auth.errors, fe: dict.auth.fieldErrors }} />
            </div>
          </EditorGate>
        </Suspense>
      </EditorBody>
    </>
  );
}

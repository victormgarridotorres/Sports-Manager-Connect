import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { PageBody, SubHero } from "@/components/page-shell";
import { isLegalSlug, legalDocs, legalSlugs } from "@/content/legal";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export function generateStaticParams() {
  return locales.flatMap((locale) => legalSlugs.map((doc) => ({ locale, doc })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!hasLocale(locale) || !isLegalSlug(doc)) return {};
  return { title: (await getDictionary(locale)).legal.docs[doc] };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, doc } = await params;
  if (!hasLocale(locale) || !isLegalSlug(doc)) notFound();
  const dict = await getDictionary(locale);
  const content = legalDocs[doc];

  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.legal.title }, { label: dict.legal.docs[doc] }]}
        title={dict.legal.docs[doc]}
      />
      <PageBody>
        <article lang="es" className="card-box mx-auto max-w-[860px] !p-6 sm:!p-10">
          {locale !== "es" ? (
            <p lang={locale} className="alert alert-warning mb-6">
              {dict.legal.onlyInSpanish}
            </p>
          ) : null}
          <LegalDocument blocks={content.blocks} />
        </article>
      </PageBody>
    </>
  );
}

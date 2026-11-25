import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { PlanCards } from "@/components/plan-cards";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/plans">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).plans.crumb } : {};
}

export default async function PlansPage({ params }: PageProps<"/[locale]/plans">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.plans.crumb }]}
        eyebrow={dict.plans.eyebrow}
        title={dict.plans.title}
        lead={dict.plans.lead}
      />
      <PageBody>
        <PlanCards locale={locale} dict={dict} />
      </PageBody>
    </>
  );
}

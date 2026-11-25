import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { PlanCards } from "@/components/plan-cards";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).auth.signup.crumb } : {};
}

/** Paso 1: elegir el tipo de perfil (equivale a "Planes" en el prototipo). */
export default async function ChooseRolePage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const s = dict.auth.signup;

  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: s.crumb }]}
        eyebrow={s.chooseEyebrow}
        title={s.chooseTitle}
        lead={s.chooseLead}
      />
      <PageBody>
        <PlanCards locale={locale} dict={dict} />
      </PageBody>
    </>
  );
}

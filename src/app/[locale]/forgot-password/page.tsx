import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).auth.forgot.title } : {};
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.auth.forgot;

  return (
    <>
      <SubHero
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.auth.login.title, href: `/${locale}/login` },
          { label: t.title },
        ]}
        title={t.title}
        lead={t.lead}
      />
      <PageBody narrow>
        <ForgotPasswordForm locale={locale} t={dict.auth} />
      </PageBody>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).auth.reset.title } : {};
}

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.auth.reset;

  return (
    <>
      <SubHero title={t.title} lead={t.lead} />
      <PageBody narrow>
        <Suspense>
          <RequireSession locale={locale}>
            <ResetPasswordForm locale={locale} t={dict.auth} />
          </RequireSession>
        </Suspense>
      </PageBody>
    </>
  );
}

// El enlace del correo crea una sesión de recuperación; sin ella no hay formulario.
async function RequireSession({ locale, children }: { locale: Locale; children: ReactNode }) {
  await requireAccount(locale);
  return children;
}

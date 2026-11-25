import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/profile/account-shell";
import { DeleteAccountForm, EmailForm, PasswordForm, PreferencesForm } from "@/components/profile/account-forms";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import type { Visibility } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/account">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).profile.nav.account } : {};
}

export default async function AccountPage({ params }: PageProps<"/[locale]/dashboard/account">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <AccountShell locale={locale} dict={dict} current="account" title={dict.account.title} lead={dict.account.lead}>
      <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
        <AccountSettings locale={locale} dict={dict} />
      </Suspense>
    </AccountShell>
  );
}

async function AccountSettings({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/dashboard/account`);
  const supabase = await createClient();
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("preferred_locale, visibility").eq("id", account.id).single(),
    supabase.from("account_private").select("marketing_opt_in").eq("profile_id", account.id).maybeSingle(),
  ]);
  const a = dict.account;
  const t = {
    a,
    p: dict.profile,
    o: dict.options,
    errors: dict.auth.errors,
    fe: dict.auth.fieldErrors,
    passwordHint: dict.auth.passwordHint,
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="card-box">
        <h3>{a.preferencesTitle}</h3>
        <PreferencesForm
          locale={locale}
          current={{
            preferredLocale: profile?.preferred_locale ?? locale,
            visibility: (profile?.visibility as Visibility | undefined) ?? "public",
            marketing: priv?.marketing_opt_in ?? false,
          }}
          t={t}
        />
      </section>
      <section className="card-box">
        <h3>{a.emailTitle}</h3>
        <EmailForm locale={locale} email={account.email ?? ""} t={t} />
      </section>
      <section className="card-box">
        <h3>{a.passwordTitle}</h3>
        <PasswordForm t={t} />
      </section>
      <section className="card-box danger-zone flex flex-col gap-3">
        <h3 className="!mb-0">{a.deleteTitle}</h3>
        <p className="text-[13.5px] text-ink">{a.deleteBody}</p>
        <DeleteAccountForm locale={locale} t={t} />
      </section>
    </div>
  );
}

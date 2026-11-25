import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/profile/account-shell";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/profile">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).profile.nav.profile } : {};
}

export default async function EditProfilePage({ params }: PageProps<"/[locale]/dashboard/profile">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <AccountShell locale={locale} dict={dict} current="profile" title={dict.profile.editTitle} lead={dict.profile.editLead}>
      <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
        <ProfileEditor locale={locale} tab="basics" dict={dict} />
      </Suspense>
    </AccountShell>
  );
}

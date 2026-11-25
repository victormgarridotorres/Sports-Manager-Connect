import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/profile/account-shell";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { profileTabs, type ProfileTab } from "@/lib/profile/completion";

const isTab = (v: string): v is ProfileTab => (profileTabs as readonly string[]).includes(v) && v !== "basics";

export function generateStaticParams() {
  return profileTabs.filter((t) => t !== "basics").map((tab) => ({ tab }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/profile/[tab]">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).profile.nav.profile } : {};
}

export default async function EditProfileTabPage({ params }: PageProps<"/[locale]/dashboard/profile/[tab]">) {
  const { locale, tab } = await params;
  if (!hasLocale(locale) || !isTab(tab)) notFound();
  const dict = await getDictionary(locale);
  return (
    <AccountShell locale={locale} dict={dict} current="profile" title={dict.profile.editTitle} lead={dict.profile.editLead}>
      <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
        <ProfileEditor locale={locale} tab={tab} dict={dict} />
      </Suspense>
    </AccountShell>
  );
}

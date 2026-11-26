import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IdentityForm } from "@/components/forum/forms";
import { AccountShell } from "@/components/profile/account-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { suggestAlias } from "@/lib/forum/options";
import { myForumIdentity } from "@/lib/forum/queries";

type Props = PageProps<"/[locale]/dashboard/forum">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).community.identity.crumb };
}

export default async function ForumIdentityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.community.identity;
  return (
    <AccountShell locale={locale} dict={dict} current="forum" title={t.title} lead={t.lead}>
      <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
        <Identity locale={locale} dict={dict} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}

async function Identity({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const account = await requireAccount(locale, `/${locale}/dashboard/forum`);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next, "") : "";
  if (!account.permissions.includes("content.comment")) {
    return <div className="card-box text-[14px] text-muted">{dict.community.cannotWrite}</div>;
  }
  const identity = await myForumIdentity(account.id);
  return (
    <IdentityForm
      locale={locale}
      initial={identity ?? { alias: suggestAlias(locale, account.id), avatar: "eagle" }}
      next={next || (identity ? undefined : `/${locale}/community`)}
      isNew={!identity}
      t={dict.community}
      e={{ errors: dict.auth.errors, fe: dict.auth.fieldErrors }}
    />
  );
}

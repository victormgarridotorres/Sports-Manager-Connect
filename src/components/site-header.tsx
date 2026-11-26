import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getAccount } from "@/lib/auth/dal";
import { unreadCount } from "@/lib/messages/queries";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { LanguageMenu } from "./language-menu";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Messages }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[rgba(18,19,26,.92)] backdrop-blur-md">
      <div className="wrap flex h-[76px] items-center justify-between gap-2 sm:gap-3">
        <Brand locale={locale} title={dict.meta.title} />
        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <Link href={`/${locale}/move`} className="hidden text-sm font-semibold text-[#c6c8d2] hover:text-white md:inline">
            Move
          </Link>
          <Link href={`/${locale}/listings`} className="hidden text-sm font-semibold text-[#c6c8d2] hover:text-white md:inline">
            {dict.listings.crumb}
          </Link>
          <Link href={`/${locale}/news`} className="hidden text-sm font-semibold text-[#c6c8d2] hover:text-white lg:inline">
            {dict.news.crumb}
          </Link>
          <Link href={`/${locale}/community`} className="hidden text-sm font-semibold text-[#c6c8d2] hover:text-white md:inline">
            {dict.community.crumb}
          </Link>
          <Link href={`/${locale}/plans`} className="mr-1 hidden text-sm font-semibold text-[#c6c8d2] hover:text-white md:inline">
            {dict.nav.plans}
          </Link>
          <LanguageMenu locale={locale} label={dict.nav.language} />
          {/* La sesión se lee en tiempo de petición: va en Suspense para no bloquear la página. */}
          <Suspense fallback={<span className="w-10" />}>
            <AuthNav locale={locale} dict={dict} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function AuthNav({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await getAccount();

  if (!account) {
    return (
      <>
        <Link href={`/${locale}/login`} className="btn btn-ghost btn-sm">
          {dict.nav.login}
        </Link>
        <Link href={`/${locale}/signup`} className="btn btn-gold btn-sm hidden sm:inline-flex">
          {dict.nav.join}
        </Link>
      </>
    );
  }

  const unread = account.permissions.includes("messages.send") ? await unreadCount() : 0;
  const role = dict.roles[account.role].name;
  const status = account.verificationStatus === "not_required" ? "" : ` · ${dict.verification[account.verificationStatus]}`;
  return (
    <>
    {account.permissions.includes("messages.send") ? (
      <Link
        href={`/${locale}/messages`}
        className="relative flex size-10 items-center justify-center rounded-full border border-white/15 text-base hover:border-white/30"
        aria-label={unread ? `${dict.messages.crumb} (${unread})` : dict.messages.crumb}
      >
        <span aria-hidden>✉️</span>
        {unread ? <span className="nav-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </Link>
    ) : null}
    <AccountMenu
      locale={locale}
      name={account.displayName}
      subtitle={role + status}
      userId={account.id}
      labels={{
        menu: dict.nav.account,
        dashboard: dict.nav.dashboard,
        logout: dict.nav.logout,
        profile: dict.profile.nav.profile,
        viewPublic: dict.profile.nav.viewPublic,
        account: dict.profile.nav.account,
        favorites: dict.favorites.crumb,
        listings: dict.listings.crumb,
        community: dict.community.crumb,
        messages: dict.messages.crumb,
      }}
    />
    </>
  );
}

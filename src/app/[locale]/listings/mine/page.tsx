import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingRowCard } from "@/components/listings/listing-row";
import { PageBody, SubHero } from "@/components/page-shell";
import { QueryNotice } from "@/components/query-notice";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requestNow } from "@/lib/request-time";
import { requireAccount } from "@/lib/auth/dal";
import { parseListingFilters } from "@/lib/listings/params";
import { searchListings } from "@/lib/listings/queries";

const tabs = ["mine", "applied", "saved"] as const;
type Tab = (typeof tabs)[number];

export async function generateMetadata({ params }: PageProps<"/[locale]/listings/mine">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).listings.mine } : {};
}

export default async function MyListingsPage({ params, searchParams }: PageProps<"/[locale]/listings/mine">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const l = dict.listings;
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb, href: `/${locale}/listings` }, { label: l.mine }]}
        eyebrow={dict.profile.eyebrow}
        title={l.mineTitle}
        lead={l.mineLead}
      />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <Mine locale={locale} dict={dict} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function Mine({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: PageProps<"/[locale]/listings/mine">["searchParams"] }) {
  await requireAccount(locale, `/${locale}/listings/mine`);
  const raw = await searchParams;
  const tab: Tab = tabs.includes(raw.tab as Tab) ? (raw.tab as Tab) : "mine";
  const { rows } = await searchListings(parseListingFilters({}), tab, undefined, 50);
  const l = dict.listings;
  const now = await requestNow();
  const base = `/${locale}/listings/mine`;
  return (
    <div className="mx-auto max-w-[960px]">
      <div className="mb-4"><QueryNotice param="deleted" text={l.deletedNotice} /></div>
      <nav className="tabs" aria-label={l.mine}>
        {tabs.map((t) => (
          <Link key={t} href={t === "mine" ? base : `${base}?tab=${t}`} className={`tab ${t === tab ? "active" : ""}`} aria-current={t === tab ? "page" : undefined}>
            {l.mineTabs[t]}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className="tm-list">{rows.map((r) => <ListingRowCard key={r.id} row={r} locale={locale} dict={dict} now={now} />)}</div>
      ) : (
        <div className="card-box flex flex-col items-start gap-3 text-[14px]">
          <p className="font-bold">{l.mineEmpty[tab]}</p>
          <Link href={`/${locale}/listings`} className="btn btn-gold btn-sm">{l.goBoard}</Link>
        </div>
      )}
    </div>
  );
}

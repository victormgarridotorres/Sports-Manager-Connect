import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingFiltersForm, SimplePagination } from "@/components/listings/listing-filters";
import { ListingRowCard } from "@/components/listings/listing-row";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requestNow } from "@/lib/request-time";
import { requireAccount } from "@/lib/auth/dal";
import { publishableTypes } from "@/lib/listings/options";
import { listingQuery, LISTINGS_PAGE_SIZE, parseListingFilters } from "@/lib/listings/params";
import { getProfessionalType, searchListings } from "@/lib/listings/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/listings">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const l = (await getDictionary(locale)).listings;
  return { title: l.crumb, description: l.lead };
}

export default async function ListingsPage({ params, searchParams }: PageProps<"/[locale]/listings">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const l = dict.listings;
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb }]} eyebrow={l.eyebrow} title={l.title} lead={l.lead} />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <Board locale={locale} dict={dict} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function Board({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: PageProps<"/[locale]/listings">["searchParams"] }) {
  const account = await requireAccount(locale, `/${locale}/listings`);
  const filters = parseListingFilters(await searchParams);
  const proType = account.role === "professional" ? await getProfessionalType(account.id) : null;
  const canPublish = publishableTypes(account.role, account.permissions, proType).length > 0;
  const { rows, total, error } = await searchListings(filters);
  const l = dict.listings;
  const now = await requestNow();
  const base = `/${locale}/listings`;

  return (
    <div className="tm-layout">
      <ListingFiltersForm locale={locale} dict={dict} filters={filters} />
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-bold text-white" aria-live="polite">
            {format(total === 1 ? l.resultsOne : l.results, { n: total })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`${base}/mine`} className="btn btn-ghost btn-sm">
              {l.mine}
            </Link>
            {canPublish ? (
              <Link href={`${base}/new`} className="btn btn-gold btn-sm">
                + {l.publish}
              </Link>
            ) : null}
          </div>
        </div>
        {error ? (
          <div className="card-box text-[14px] text-muted">{dict.auth.errors.generic}</div>
        ) : rows.length ? (
          <div className="tm-list">
            {rows.map((r) => (
              <ListingRowCard key={r.id} row={r} locale={locale} dict={dict} now={now} />
            ))}
          </div>
        ) : (
          <div className="card-box flex flex-col items-start gap-3 text-[14px]">
            <p className="font-bold">{l.empty}</p>
            <p className="text-muted">{canPublish ? l.emptyCanPublish : l.emptyHint}</p>
            {canPublish ? (
              <Link href={`${base}/new`} className="btn btn-gold btn-sm">
                + {l.publish}
              </Link>
            ) : null}
          </div>
        )}
        <SimplePagination hrefFor={(p) => `${base}${listingQuery(filters, { page: p })}`} page={filters.page} total={total} pageSize={LISTINGS_PAGE_SIZE} t={dict.move} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MoveCard } from "@/components/move/move-card";
import { MoveFiltersForm } from "@/components/move/move-filters";
import { Pagination } from "@/components/move/pagination";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { hasActiveFilters, parseMoveFilters } from "@/lib/move/params";
import { searchMove } from "@/lib/move/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/move">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: "Move", description: (await getDictionary(locale)).move.lead } : {};
}

export default async function MovePage({ params, searchParams }: PageProps<"/[locale]/move">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: "Move" }]}
        eyebrow={dict.move.eyebrow}
        title={dict.move.title}
        lead={dict.move.lead}
      />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <MoveContent locale={locale} dict={dict} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function MoveContent({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Messages;
  searchParams: PageProps<"/[locale]/move">["searchParams"];
}) {
  const account = await requireAccount(locale, `/${locale}/move`);
  const filters = parseMoveFilters(await searchParams);
  const canScout = account.permissions.includes("talent.search");
  const canFollow = account.permissions.includes("profiles.follow");
  const { rows, total, error } = await searchMove(filters);
  const m = dict.move;
  const now = new Date();

  return (
    <div className="tm-layout">
      <MoveFiltersForm locale={locale} dict={dict} filters={filters} canScout={canScout} />
      <div>
        <p className="mb-4 text-[14px] font-bold text-white" aria-live="polite">
          {format(total === 1 ? m.resultsOne : m.results, { n: total })}
        </p>
        {error ? (
          <div className="card-box text-[14px] text-muted">{dict.auth.errors.generic}</div>
        ) : rows.length ? (
          <div className="tm-list">
            {rows.map((r) => (
              <MoveCard key={r.id} row={r} locale={locale} dict={dict} canFollow={canFollow && r.id !== account.id} now={now} />
            ))}
          </div>
        ) : (
          <div className="card-box flex flex-col items-start gap-3 text-[14px]">
            <p className="font-bold">{hasActiveFilters(filters) ? m.emptyFiltered : m.empty}</p>
            <p className="text-muted">{m.emptyHint}</p>
            {hasActiveFilters(filters) ? (
              <Link href={`/${locale}/move`} className="text-link">
                {m.clear}
              </Link>
            ) : null}
          </div>
        )}
        <Pagination base={`/${locale}/move`} filters={filters} total={total} t={m} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MoveCard } from "@/components/move/move-card";
import { Pagination } from "@/components/move/pagination";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requestNow } from "@/lib/request-time";
import { requireAccount } from "@/lib/auth/dal";
import { roles } from "@/lib/auth/permissions";
import { parseMoveFilters, toQuery } from "@/lib/move/params";
import { searchMove } from "@/lib/move/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/favorites">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).favorites.crumb } : {};
}

export default async function FavoritesPage({ params, searchParams }: PageProps<"/[locale]/favorites">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const f = dict.favorites;
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: f.crumb }]}
        eyebrow={dict.profile.eyebrow}
        title={f.title}
        lead={f.lead}
      />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <Favorites locale={locale} dict={dict} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function Favorites({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Messages;
  searchParams: PageProps<"/[locale]/favorites">["searchParams"];
}) {
  const account = await requireAccount(locale, `/${locale}/favorites`);
  const filters = parseMoveFilters(await searchParams, roles);
  const { rows, total } = await searchMove({ ...filters, sort: "name" }, true);
  const base = `/${locale}/favorites`;
  const now = await requestNow();
  const f = dict.favorites;

  return (
    <div className="mx-auto max-w-[900px]">
      <nav className="mb-5 flex flex-wrap gap-2" aria-label={f.filterLabel}>
        {[undefined, "player", "club", "professional", "fan"].map((r) => {
          const active = (filters.role ?? undefined) === r;
          return (
            <Link
              key={r ?? "all"}
              href={`${base}${toQuery({ ...filters, page: 1 }, { role: r as (typeof roles)[number] | undefined })}`}
              className={`chip ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {r ? dict.roles[r as (typeof roles)[number]].name : dict.move.all}
            </Link>
          );
        })}
      </nav>
      {rows.length ? (
        <div className="tm-list">
          {rows.map((r) => (
            <MoveCard key={r.id} row={r} locale={locale} dict={dict} canFollow={account.permissions.includes("profiles.follow")} now={now} />
          ))}
        </div>
      ) : (
        <div className="card-box flex flex-col items-start gap-3 text-[14px]">
          <p className="font-bold">{f.empty}</p>
          <p className="text-muted">{f.emptyHint}</p>
          <Link href={`/${locale}/move`} className="btn btn-gold btn-sm">
            {f.goMove}
          </Link>
        </div>
      )}
      <Pagination base={base} filters={filters} total={total} t={dict.move} />
    </div>
  );
}

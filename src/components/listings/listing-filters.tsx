import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { countryOptions } from "@/lib/countries";
import { listingSorts, listingTypes } from "@/lib/listings/options";
import type { ListingFilters } from "@/lib/listings/params";
import { playerPositions } from "@/lib/profile/options";
import { CollapsibleFilters } from "../move/collapsible-filters";

export function ListingFiltersForm({ locale, dict, filters }: { locale: Locale; dict: Messages; filters: ListingFilters }) {
  const l = dict.listings;
  const base = `/${locale}/listings`;
  const active = [filters.q, filters.country, filters.position].filter(Boolean).length + filters.type.length;
  return (
    <form action={base} method="get" className="filter-box text-ink">
      <CollapsibleFilters title={dict.move.filters} activeCount={active}>
        <div className="filter-group form-field">
          <label htmlFor="q">{dict.move.search}</label>
          <input id="q" name="q" type="search" defaultValue={filters.q ?? ""} maxLength={80} placeholder={l.searchPlaceholder} />
        </div>
        <div className="filter-group form-field">
          <label htmlFor="country">{dict.move.country}</label>
          <select id="country" name="country" defaultValue={filters.country ?? ""}>
            <option value="">{dict.move.allCountries}</option>
            <option value="INT">🌍 {l.international}</option>
            {countryOptions(locale).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="filter-group">
          <legend>{l.typeFilter}</legend>
          <div className="flex flex-col gap-2">
            {listingTypes.map((t) => (
              <label key={t} className="form-check">
                <input type="checkbox" name="type" value={t} defaultChecked={filters.type.includes(t)} />
                <span>{l.types[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="filter-group form-field">
          <label htmlFor="position">{l.form.position}</label>
          <select id="position" name="position" defaultValue={filters.position ?? ""}>
            <option value="">{l.form.positionAny}</option>
            {playerPositions.map((p) => (
              <option key={p} value={p}>
                {dict.options.positions[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group form-field">
          <label htmlFor="sort">{dict.move.sort}</label>
          <select id="sort" name="sort" defaultValue={filters.sort}>
            {listingSorts.map((s) => (
              <option key={s} value={s}>
                {l.sorts[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <button type="submit" className="btn btn-gold w-full">
            {dict.move.apply}
          </button>
          <Link href={base} className="btn btn-ghost-light w-full">
            {dict.move.clear}
          </Link>
        </div>
      </CollapsibleFilters>
    </form>
  );
}

export function SimplePagination({ hrefFor, page, total, pageSize, t }: { hrefFor: (p: number) => string; page: number; total: number; pageSize: number; t: Messages["move"] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-[13.5px] text-on-dark" aria-label={t.pagination}>
      {page > 1 ? <Link className="btn btn-ghost btn-sm" href={hrefFor(page - 1)} rel="prev">← {t.prev}</Link> : null}
      <span>{t.pageOf.replace("{page}", String(page)).replace("{pages}", String(pages))}</span>
      {page < pages ? <Link className="btn btn-ghost btn-sm" href={hrefFor(page + 1)} rel="next">{t.next} →</Link> : null}
    </nav>
  );
}

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { countryOptions } from "@/lib/countries";
import { moveRoles, moveSorts, type MoveFilters } from "@/lib/move/params";
import { CollapsibleFilters } from "./collapsible-filters";
import { availabilities, defensePositions, hands, playerPositions, professionalTypes } from "@/lib/profile/options";

function Chips<T extends string>({ name, values, selected, labels }: { name: string; values: readonly T[]; selected: T[]; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <label key={v} className="chip">
          <input type="checkbox" name={name} value={v} defaultChecked={selected.includes(v)} className="sr-only" />
          {labels[v] ?? v}
        </label>
      ))}
    </div>
  );
}

function activeCount(f: MoveFilters) {
  return [f.role, f.country, f.q, f.league, f.ageMin, f.ageMax, f.heightMin, f.hand].filter(Boolean).length
    + f.pos.length + f.def.length + f.spec.length + f.avail.length;
}

/**
 * Formulario GET de filtros: los filtros viajan en la URL, así que funciona
 * sin JavaScript y una búsqueda se puede compartir.
 */
export function MoveFiltersForm({
  locale,
  dict,
  filters,
  canScout,
}: {
  locale: Locale;
  dict: Messages;
  filters: MoveFilters;
  canScout: boolean;
}) {
  const m = dict.move;
  const o = dict.options;
  const base = `/${locale}/move`;
  return (
    <form action={base} method="get" className="filter-box text-ink">
      <CollapsibleFilters title={m.filters} activeCount={activeCount(filters)}>

      <div className="filter-group form-field">
        <label htmlFor="q">{m.search}</label>
        <input id="q" name="q" type="search" defaultValue={filters.q ?? ""} maxLength={80} placeholder={m.searchPlaceholder} />
      </div>

      <div className="filter-group form-field">
        <label htmlFor="country">{m.country}</label>
        <select id="country" name="country" defaultValue={filters.country ?? ""}>
          <option value="">{m.allCountries}</option>
          {countryOptions(locale).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="filter-group">
        <legend>{m.profileType}</legend>
        <div className="flex flex-wrap gap-1.5">
          {["", ...moveRoles].map((r) => (
            <label key={r || "all"} className="chip">
              <input type="radio" name="role" value={r} defaultChecked={(filters.role ?? "") === r} className="sr-only" />
              {r ? dict.roles[r as (typeof moveRoles)[number]].name : m.all}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>{m.attack}</legend>
        <Chips name="pos" values={playerPositions} selected={filters.pos} labels={o.positions} />
      </fieldset>
      <fieldset className="filter-group">
        <legend>{m.defense}</legend>
        <Chips name="def" values={defensePositions} selected={filters.def} labels={o.defense} />
      </fieldset>
      <fieldset className="filter-group">
        <legend>{m.specialty}</legend>
        <Chips name="spec" values={professionalTypes} selected={filters.spec} labels={o.professionalTypes} />
      </fieldset>

      <div className="filter-group form-field">
        <label htmlFor="league">{m.league}</label>
        <input id="league" name="league" defaultValue={filters.league ?? ""} maxLength={80} placeholder={dict.profile.fields.currentLeaguePlaceholder} />
      </div>

      <fieldset className="filter-group rounded-[12px] border border-line bg-paper-soft p-3.5">
        <legend className="!mb-1 px-1">🔍 {m.scouting}</legend>
        {canScout ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="form-field">
                <label htmlFor="ageMin">{m.ageMin}</label>
                <input id="ageMin" name="ageMin" type="number" inputMode="numeric" min={16} max={80} defaultValue={filters.ageMin ?? ""} />
              </div>
              <div className="form-field">
                <label htmlFor="ageMax">{m.ageMax}</label>
                <input id="ageMax" name="ageMax" type="number" inputMode="numeric" min={16} max={80} defaultValue={filters.ageMax ?? ""} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="heightMin">{m.heightMin}</label>
              <input id="heightMin" name="heightMin" type="number" inputMode="numeric" min={120} max={230} defaultValue={filters.heightMin ?? ""} />
            </div>
            <div className="form-field">
              <label htmlFor="hand">{m.hand}</label>
              <select id="hand" name="hand" defaultValue={filters.hand ?? ""}>
                <option value="">{m.any}</option>
                {hands.map((h) => (
                  <option key={h} value={h}>
                    {o.hands[h]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-bold text-muted">{m.availability}</p>
              <Chips name="avail" values={availabilities} selected={filters.avail} labels={o.availability} />
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">🔒 {m.scoutingLocked}</p>
        )}
      </fieldset>

      <div className="filter-group form-field">
        <label htmlFor="sort">{m.sort}</label>
        <select id="sort" name="sort" defaultValue={filters.sort}>
          {moveSorts.map((s) => (
            <option key={s} value={s}>
              {m.sorts[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" className="btn btn-gold w-full">
          {m.apply}
        </button>
        <Link href={base} className="btn btn-ghost-light w-full">
          {m.clear}
        </Link>
      </div>
      </CollapsibleFilters>
    </form>
  );
}

import { countryCodes } from "@/lib/countries";
import { playerPositions } from "@/lib/profile/options";
import { listingSorts, listingTypes } from "./options";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const isIn = <T extends readonly string[]>(values: T, v: string | undefined): v is T[number] =>
  !!v && (values as readonly string[]).includes(v);

export type ListingFilters = {
  q?: string;
  country?: string; // código ISO o "INT" (internacional)
  type: (typeof listingTypes)[number][];
  position?: (typeof playerPositions)[number];
  sort: (typeof listingSorts)[number];
  page: number;
};

export const LISTINGS_PAGE_SIZE = 20;

export function parseListingFilters(raw: Raw): ListingFilters {
  const country = one(raw.country);
  const position = one(raw.position);
  const sort = one(raw.sort);
  const page = Number(one(raw.page));
  return {
    q: one(raw.q)?.slice(0, 80),
    country: country === "INT" || isIn(countryCodes, country) ? country : undefined,
    type: [...new Set(list(raw.type).filter((t) => isIn(listingTypes, t)))] as ListingFilters["type"],
    position: isIn(playerPositions, position) ? position : undefined,
    sort: isIn(listingSorts, sort) ? sort : "recent",
    page: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

export function listingQuery(f: ListingFilters, overrides: Partial<ListingFilters> = {}) {
  const m = { ...f, ...overrides };
  const sp = new URLSearchParams();
  if (m.q) sp.set("q", m.q);
  if (m.country) sp.set("country", m.country);
  for (const t of m.type) sp.append("type", t);
  if (m.position) sp.set("position", m.position);
  if (m.sort !== "recent") sp.set("sort", m.sort);
  if (m.page > 1) sp.set("page", String(m.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function listingRpcArgs(f: ListingFilters, scope: "board" | "mine" | "saved" | "applied" = "board", exclude?: string, limit = LISTINGS_PAGE_SIZE) {
  return {
    p_query: f.q ?? null,
    p_country: f.country ?? null,
    p_types: f.type.length ? f.type : null,
    p_position: f.position ?? null,
    p_scope: scope,
    p_sort: f.sort,
    p_exclude: exclude ?? null,
    p_limit: limit,
    p_offset: (f.page - 1) * limit,
  };
}

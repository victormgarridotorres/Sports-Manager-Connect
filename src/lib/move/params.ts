import { z } from "zod";
import { countryCodes } from "@/lib/countries";
import { roles } from "@/lib/auth/permissions";
import { availabilities, defensePositions, hands, playerPositions, professionalTypes } from "@/lib/profile/options";

/*
 * Filtros de Move, leídos de la URL (?role=player&pos=pivot&pos=left_wing…).
 * Así una búsqueda se puede compartir o guardar, y el formulario funciona sin JS.
 * Los valores no válidos se descartan en silencio.
 */

export const moveRoles = ["player", "professional", "club"] as const;
export const moveSorts = ["recent", "followers", "name"] as const;
export const PAGE_SIZE = 20;

type Raw = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const pick = <T extends readonly string[]>(values: T, v: string | undefined) =>
  v && (values as readonly string[]).includes(v) ? (v as T[number]) : undefined;
const pickAll = <T extends readonly string[]>(values: T, v: string | string[] | undefined) =>
  [...new Set(list(v).filter((x) => (values as readonly string[]).includes(x)))] as T[number][];
const int = (v: string | undefined, min: number, max: number) => {
  const n = z.coerce.number().int().min(min).max(max).safeParse(v);
  return v && n.success ? n.data : undefined;
};

export type MoveFilters = {
  role?: (typeof roles)[number];
  country?: (typeof countryCodes)[number];
  q?: string;
  pos: (typeof playerPositions)[number][];
  def: (typeof defensePositions)[number][];
  spec: (typeof professionalTypes)[number][];
  league?: string;
  ageMin?: number;
  ageMax?: number;
  heightMin?: number;
  hand?: (typeof hands)[number];
  avail: (typeof availabilities)[number][];
  sort: (typeof moveSorts)[number];
  page: number;
};

export function parseMoveFilters(raw: Raw, allowedRoles: readonly string[] = moveRoles): MoveFilters {
  return {
    role: pick(roles, one(raw.role)) && allowedRoles.includes(one(raw.role)!) ? pick(roles, one(raw.role)) : undefined,
    country: pick(countryCodes, one(raw.country)),
    q: one(raw.q)?.slice(0, 80),
    pos: pickAll(playerPositions, raw.pos),
    def: pickAll(defensePositions, raw.def),
    spec: pickAll(professionalTypes, raw.spec),
    league: one(raw.league)?.slice(0, 80),
    ageMin: int(one(raw.ageMin), 16, 80),
    ageMax: int(one(raw.ageMax), 16, 80),
    heightMin: int(one(raw.heightMin), 120, 230),
    hand: pick(hands, one(raw.hand)),
    avail: pickAll(availabilities, raw.avail),
    sort: pick(moveSorts, one(raw.sort)) ?? "recent",
    page: int(one(raw.page), 1, 500) ?? 1,
  };
}

/** Argumentos para public.search_move (los de ojeo los vuelve a filtrar la BD por permiso). */
export function toRpcArgs(f: MoveFilters, favoritesOnly = false) {
  const arr = <T>(a: T[]) => (a.length ? a : null);
  return {
    p_role: f.role ?? null,
    p_country: f.country ?? null,
    p_query: f.q ?? null,
    p_positions: arr(f.pos),
    p_defense: arr(f.def),
    p_specialties: arr(f.spec),
    p_league: f.league ?? null,
    p_age_min: f.ageMin ?? null,
    p_age_max: f.ageMax ?? null,
    p_height_min: f.heightMin ?? null,
    p_hand: f.hand ?? null,
    p_availability: arr(f.avail),
    p_favorites_only: favoritesOnly,
    p_sort: f.sort,
    p_limit: PAGE_SIZE,
    p_offset: (f.page - 1) * PAGE_SIZE,
  };
}

/** Query string de unos filtros (para paginación y enlaces). */
export function toQuery(f: MoveFilters, overrides: Partial<MoveFilters> = {}) {
  const merged = { ...f, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || (Array.isArray(v) && !v.length)) continue;
    if (k === "sort" && v === "recent") continue;
    if (k === "page" && v === 1) continue;
    for (const item of Array.isArray(v) ? v : [v]) sp.append(k, String(item));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: MoveFilters) {
  return !!(f.role || f.country || f.q || f.pos.length || f.def.length || f.spec.length || f.league
    || f.ageMin || f.ageMax || f.heightMin || f.hand || f.avail.length);
}

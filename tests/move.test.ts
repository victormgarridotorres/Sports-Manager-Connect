import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseMoveFilters, PAGE_SIZE, toQuery, toRpcArgs } from "@/lib/move/params";
import { roles } from "@/lib/auth/permissions";

describe("filtros de Move desde la URL", () => {
  it("lee filtros válidos, incluidos los múltiples", () => {
    const f = parseMoveFilters({ role: "player", country: "ES", pos: ["pivot", "left_wing"], def: "central", sort: "followers", page: "3" });
    expect(f).toMatchObject({ role: "player", country: "ES", pos: ["pivot", "left_wing"], def: ["central"], sort: "followers", page: 3 });
  });

  it("descarta valores no válidos en silencio", () => {
    const f = parseMoveFilters({ role: "admin", country: "XX", pos: ["delantero", "pivot"], sort: "hack", page: "-2", ageMin: "5", heightMin: "abc" });
    expect(f.role).toBeUndefined();
    expect(f.country).toBeUndefined();
    expect(f.pos).toEqual(["pivot"]);
    expect(f.sort).toBe("recent");
    expect(f.page).toBe(1);
    expect(f.ageMin).toBeUndefined();
    expect(f.heightMin).toBeUndefined();
  });

  it("Move no admite aficionados; Favoritos sí", () => {
    expect(parseMoveFilters({ role: "fan" }).role).toBeUndefined();
    expect(parseMoveFilters({ role: "fan" }, roles).role).toBe("fan");
  });

  it("la URL generada se vuelve a leer igual (ida y vuelta)", () => {
    const f = parseMoveFilters({ role: "player", pos: ["pivot", "goalkeeper"], q: "Lucía", page: "2" });
    const again = parseMoveFilters(Object.fromEntries(
      [...new URLSearchParams(toQuery(f).slice(1)).entries()].reduce((m, [k, v]) => m.set(k, [...(m.get(k) ?? []), v]), new Map<string, string[]>()),
    ));
    expect(again).toEqual(f);
    expect(toQuery(parseMoveFilters({}))).toBe("");
  });

  it("paginación y argumentos para la BD", () => {
    const args = toRpcArgs(parseMoveFilters({ page: "3" }));
    expect(args.p_offset).toBe(2 * PAGE_SIZE);
    expect(args.p_positions).toBeNull();
    expect(toRpcArgs(parseMoveFilters({}), true).p_favorites_only).toBe(true);
  });

  it("detecta si hay filtros activos", () => {
    expect(hasActiveFilters(parseMoveFilters({ sort: "name" }))).toBe(false);
    expect(hasActiveFilters(parseMoveFilters({ league: "asobal" }))).toBe(true);
  });
});

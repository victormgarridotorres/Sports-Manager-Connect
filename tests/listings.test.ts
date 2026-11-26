import { describe, expect, it } from "vitest";
import { effectivePermissions } from "@/lib/auth/permissions";
import { lines, publishableTypes } from "@/lib/listings/options";
import { listingQuery, listingRpcArgs, parseListingFilters } from "@/lib/listings/params";
import { listingSchema } from "@/lib/listings/schemas";
import { daysLeft, isNew } from "@/lib/listings/time";

describe("quién puede publicar cada tipo de anuncio (espejo de can_publish_listing)", () => {
  const perms = (role: Parameters<typeof effectivePermissions>[0], status: Parameters<typeof effectivePermissions>[1]) =>
    effectivePermissions(role, status);
  it.each([
    ["club verificado", "club", "verified", null, ["club_seeks"]],
    ["club pendiente", "club", "pending", null, []],
    ["jugador", "player", "not_required", null, ["player_available"]],
    ["profesional pendiente", "professional", "pending", "coach", ["professional_available"]],
    ["agente pendiente", "professional", "pending", "agent", ["professional_available"]],
    ["agente verificado", "professional", "verified", "agent", ["professional_available", "agent_represents"]],
    ["entrenador verificado", "professional", "verified", "coach", ["professional_available"]],
    ["aficionado", "fan", "not_required", null, []],
  ] as const)("%s", (_name, role, status, proType, expected) => {
    expect(publishableTypes(role, perms(role, status), proType)).toEqual(expected);
  });
});

describe("filtros del tablón", () => {
  it("lee filtros válidos y descarta el resto", () => {
    const f = parseListingFilters({ country: "INT", type: ["club_seeks", "hack"], position: "pivot", sort: "interest", page: "2" });
    expect(f).toMatchObject({ country: "INT", type: ["club_seeks"], position: "pivot", sort: "interest", page: 2 });
    expect(parseListingFilters({ country: "XX", position: "delantero" })).toMatchObject({ country: undefined, position: undefined });
  });
  it("URL y argumentos para la BD", () => {
    const f = parseListingFilters({ q: "pivote", type: "player_available" });
    expect(listingQuery(f)).toBe("?q=pivote&type=player_available");
    expect(listingQuery(f, { page: 3 })).toContain("page=3");
    expect(listingRpcArgs(f, "saved")).toMatchObject({ p_scope: "saved", p_types: ["player_available"], p_country: null });
  });
});

describe("formulario de anuncio", () => {
  const valid = { type: "club_seeks", org_name: "BM Ciudad", title: "BM Ciudad busca", highlight: "pivote", country: "", position: "", description: "Buscamos pivote para el primer equipo." };
  it("acepta un anuncio válido; país vacío = internacional", () => {
    const r = listingSchema.parse(valid);
    expect(r.country).toBeNull();
    expect(r.position).toBeNull();
    expect(r.subtitle ?? null).toBeNull();
  });
  it("exige una descripción de al menos 20 caracteres", () => {
    expect(listingSchema.safeParse({ ...valid, description: "Muy corta" }).success).toBe(false);
  });
  it("rechaza tipos inexistentes", () => {
    expect(listingSchema.safeParse({ ...valid, type: "admin_post" }).success).toBe(false);
  });
});

describe("utilidades", () => {
  it("una línea por punto, sin viñetas ni vacíos", () => {
    expect(lines("• Experiencia\n\n- Disponibilidad inmediata\r\n✓ Idiomas  ")).toEqual(["Experiencia", "Disponibilidad inmediata", "Idiomas"]);
    expect(lines(null)).toEqual([]);
  });
  it("nuevo (< 48 h) y días restantes", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(isNew("2026-11-25T12:00:00Z", now)).toBe(true);
    expect(isNew("2026-11-20T12:00:00Z", now)).toBe(false);
    expect(daysLeft("2026-12-06T12:00:00Z", now)).toBe(10);
  });
});

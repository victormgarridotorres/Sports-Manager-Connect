import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partners } from "@/content/partners";

const sql = readFileSync("supabase/migrations/20261202000000_home.sql", "utf8");

describe("portada", () => {
  it("cada colaborador tiene su logo en public/", () => {
    for (const p of partners) expect(existsSync(`public${p.logo}`), p.name).toBe(true);
  });
  it("el adelanto de anuncios solo incluye perfiles públicos y no expone descripción ni salario", () => {
    const fn = sql.slice(sql.indexOf("create function public.home_listings"));
    expect(fn).toContain("o.visibility = 'public'");
    const cols = fn.slice(0, fn.indexOf("language sql"));
    expect(cols).not.toMatch(/description|salary|owner_id|requirements/);
  });
  it("los listados de personas respetan la visibilidad (security invoker)", () => {
    for (const name of ["home_new_members", "home_moves"]) {
      const fn = sql.slice(sql.indexOf(`create function public.${name}`));
      expect(fn.slice(0, fn.indexOf("as $$"))).toContain("security invoker");
    }
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { ALIAS_RE, forumAvatarIds, forumCategories, reportReasons, suggestAlias } from "@/lib/forum/options";
import { identitySchema, reportSchema, topicSchema } from "@/lib/forum/schemas";

const sql = readFileSync("supabase/migrations/20261130000000_phase5_community.sql", "utf8");
const enumValues = (name: string) =>
  [...(sql.match(new RegExp(`create type public\\.${name} as enum\\s*\\(([^)]*)\\)`))?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe("foro: la app y la base de datos hablan el mismo idioma", () => {
  it("categorías, motivos de denuncia y avatares coinciden con la BD", () => {
    expect(enumValues("forum_category")).toEqual([...forumCategories]);
    expect(enumValues("forum_report_reason")).toEqual([...reportReasons]);
    const avatars = sql.match(/avatar in \(([^)]*)\)/)?.[1] ?? "";
    expect([...avatars.matchAll(/'([^']+)'/g)].map((m) => m[1])).toEqual(forumAvatarIds);
  });

  it("las funciones del foro nunca devuelven author_id ni display_name", () => {
    const returns = [...sql.matchAll(/returns table \(([^;]*?)\)\s*language/g)].map((m) => m[1]);
    expect(returns.length).toBeGreaterThan(3);
    for (const r of returns) {
      expect(r).not.toMatch(/author_id|display_name|profile_id|avatar_path/);
    }
  });
});

describe("alias del foro", () => {
  it.each(["Halcón_Zurdo", "Pivote7", "abc", "Ñandú-99", "a".repeat(24)])("acepta %s", (a) => {
    expect(ALIAS_RE.test(a)).toBe(true);
  });
  it.each(["ab", "Ha lcón", "a@b", "user/1", "<b>x</b>", "#tag", "a".repeat(25), "tab\there"])("rechaza %s", (a) => {
    expect(ALIAS_RE.test(a)).toBe(false);
  });
  it("los alias sugeridos son válidos en todos los idiomas y estables con semilla", () => {
    for (const l of locales) {
      for (let i = 0; i < 50; i++) expect(ALIAS_RE.test(suggestAlias(l))).toBe(true);
      expect(suggestAlias(l, "33333333-3333")).toBe(suggestAlias(l, "33333333-3333"));
    }
  });
  it("el formulario de alias valida avatar", () => {
    expect(identitySchema.safeParse({ alias: "Pivote7", avatar: "owl" }).success).toBe(true);
    expect(identitySchema.safeParse({ alias: "Pivote7", avatar: "dragon" }).success).toBe(false);
  });
});

describe("formularios del foro", () => {
  it("tema: título 5–140 y mensaje ≥10", () => {
    expect(topicSchema.safeParse({ category: "tactics", title: "Defensa 6-0", body: "¿Qué opináis de la 6-0?" }).success).toBe(true);
    expect(topicSchema.safeParse({ category: "tactics", title: "Hey", body: "¿Qué opináis de la 6-0?" }).success).toBe(false);
    expect(topicSchema.safeParse({ category: "tactics", title: "Defensa 6-0", body: "corto" }).success).toBe(false);
    expect(topicSchema.safeParse({ category: "news", title: "Defensa 6-0", body: "¿Qué opináis de la 6-0?" }).success).toBe(false);
  });
  it("denuncia: exactamente un objetivo", () => {
    const id = "e0000000-0000-0000-0000-000000000001";
    expect(reportSchema.safeParse({ topicId: id, reason: "spam" }).success).toBe(true);
    expect(reportSchema.safeParse({ reason: "spam" }).success).toBe(false);
    expect(reportSchema.safeParse({ topicId: id, postId: id, reason: "spam" }).success).toBe(false);
  });
});

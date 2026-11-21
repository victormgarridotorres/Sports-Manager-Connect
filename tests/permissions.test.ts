import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  can,
  effectivePermissions,
  lockedPermissions,
  rolePermissions,
  roles,
} from "@/lib/auth/permissions";

function sqlMatrix() {
  const dir = join(__dirname, "..", "supabase", "migrations");
  const sql = readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  const block = sql.split("insert into public.role_permissions")[1].split(";")[0];
  const rows = [...block.matchAll(/\('(\w+)',\s*'([\w.]+)',\s*(true|false)\)/g)];
  return rows.map(([, role, permission, rv]) => `${role}:${permission}:${rv}`).sort();
}

describe("matriz de permisos", () => {
  it("coincide con la migración SQL (public.role_permissions)", () => {
    const ts = roles
      .flatMap((role) => rolePermissions[role].map((g) => `${role}:${g.permission}:${g.requiresVerification}`))
      .sort();
    expect(ts).toEqual(sqlMatrix());
  });

  it("todos los roles pueden ver contenido y editar su perfil", () => {
    for (const role of roles) {
      expect(effectivePermissions(role, "not_required")).toContain("content.view");
      expect(effectivePermissions(role, "pending")).toContain("profile.edit_own");
    }
  });

  it("un aficionado no puede publicar ofertas ni buscar talento", () => {
    const fan = { role: "fan" as const, verificationStatus: "not_required" as const };
    expect(can(fan, "offers.publish")).toBe(false);
    expect(can(fan, "talent.search")).toBe(false);
    expect(can(fan, "messages.send")).toBe(false);
  });

  it("un club pendiente no publica ofertas hasta estar verificado", () => {
    expect(can({ role: "club", verificationStatus: "pending" }, "offers.publish")).toBe(false);
    expect(can({ role: "club", verificationStatus: "pending" }, "club.manage")).toBe(true);
    expect(can({ role: "club", verificationStatus: "verified" }, "offers.publish")).toBe(true);
    expect(lockedPermissions("club", "pending")).toEqual(["club.roster.manage", "offers.publish", "talent.search"]);
    expect(lockedPermissions("club", "verified")).toEqual([]);
  });

  it("un club rechazado sigue sin permisos que requieren verificación", () => {
    expect(can({ role: "club", verificationStatus: "rejected" }, "talent.search")).toBe(false);
  });

  it("sin cuenta no hay permisos", () => {
    expect(can(null, "content.view")).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { effectivePermissions } from "@/lib/auth/permissions";

const sql = readFileSync("supabase/migrations/20261203000000_admin.sql", "utf8");

/** Cuerpo de cada función «admin_…» de la migración. */
const adminFunctions = [...sql.matchAll(/create function public\.(admin_[a-z_]+)\(([\s\S]*?)\n\$\$;/g)].map((m) => ({ name: m[1], body: m[2] }));

describe("panel de administración (BD)", () => {
  it("todas las funciones de admin exigen ser administrador antes de hacer nada", () => {
    const callable = adminFunctions.filter((f) => f.name !== "admin_require");
    expect(callable.length).toBeGreaterThanOrEqual(8);
    for (const f of callable) expect(f.body, f.name).toContain("perform public.admin_require();");
  });

  it("las acciones que cambian algo quedan registradas en admin_log", () => {
    for (const name of ["admin_set_verification", "admin_set_suspended", "admin_set_staff", "admin_resolve_reports"]) {
      const f = adminFunctions.find((x) => x.name === name);
      expect(f?.body, name).toContain("insert into public.admin_log");
    }
  });

  it("una cuenta suspendida pierde todos los permisos y deja de verse", () => {
    const has = sql.slice(sql.indexOf("create or replace function public.has_permission"));
    expect(has.slice(0, has.indexOf("$$;"))).toContain("not public.is_suspended(p.id)");
    const view = sql.slice(sql.indexOf("create or replace function public.can_view_profile"));
    expect(view.slice(0, view.indexOf("$$;"))).toContain("not public.is_suspended(p.id)");
  });

  it("la nota de verificación y la suspensión solo las ve la propia persona", () => {
    expect(sql).toMatch(/create policy "account_moderation: read own"[\s\S]*?using \(profile_id = \(select auth\.uid\(\)\)\)/);
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*account_moderation/);
  });

  it("nadie puede suspenderse ni quitarse el acceso de admin a sí mismo", () => {
    expect(adminFunctions.find((f) => f.name === "admin_set_suspended")?.body).toContain("p_id = auth.uid()");
    expect(adminFunctions.find((f) => f.name === "admin_set_staff")?.body).toContain("p_id = auth.uid()");
  });

  it("los permisos que calcula la web coinciden: verificado desbloquea, pendiente no", () => {
    expect(effectivePermissions("club", "pending")).not.toContain("offers.publish");
    expect(effectivePermissions("club", "verified")).toContain("offers.publish");
  });
});

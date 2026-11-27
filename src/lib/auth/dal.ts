import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import {
  effectivePermissions,
  lockedPermissions,
  type Permission,
  type Role,
  type VerificationStatus,
} from "./permissions";

/**
 * Data Access Layer: único punto donde se lee la sesión y el perfil.
 * Cada petición lo resuelve una sola vez gracias a React.cache.
 * Al leer cookies, quien lo use debe estar dentro de un <Suspense>.
 */

export type Account = {
  id: string;
  email: string | null;
  role: Role;
  displayName: string;
  country: string | null;
  preferredLocale: string;
  verificationStatus: VerificationStatus;
  permissions: Permission[];
  lockedPermissions: Permission[];
  /** Forma parte del equipo de administración. */
  isAdmin: boolean;
  /** Cuenta suspendida por la administración: sin permisos. */
  suspended: boolean;
};

export const getAccount = cache(async (): Promise<Account | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  // El rol se lee SIEMPRE de public.profiles (no de user_metadata, que el usuario puede editar).
  const [{ data: profile, error }, { data: isAdmin }, { data: moderation }] = await Promise.all([
    supabase.from("profiles").select("id, role, display_name, country, preferred_locale, verification_status").eq("id", claims.sub).single(),
    supabase.rpc("is_admin"),
    supabase.from("account_moderation").select("suspended_at").eq("profile_id", claims.sub).maybeSingle(),
  ]);

  if (error || !profile) return null;

  const role = profile.role as Role;
  const status = profile.verification_status as VerificationStatus;

  return {
    id: profile.id,
    email: typeof claims.email === "string" ? claims.email : null,
    role,
    displayName: profile.display_name,
    country: profile.country,
    preferredLocale: profile.preferred_locale,
    verificationStatus: status,
    permissions: moderation?.suspended_at ? [] : effectivePermissions(role, status),
    lockedPermissions: lockedPermissions(role, status),
    isAdmin: isAdmin === true,
    suspended: !!moderation?.suspended_at,
  };
});

/** Exige sesión; si no la hay, redirige al login conservando el destino. */
export async function requireAccount(locale: Locale, next?: string): Promise<Account> {
  const account = await getAccount();
  if (!account) {
    const qs = next ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/${locale}/login${qs}`);
  }
  return account;
}

/** Exige ser administrador; si no, al panel. */
export async function requireAdmin(locale: Locale, next?: string): Promise<Account> {
  const account = await requireAccount(locale, next);
  if (!account.isAdmin) redirect(`/${locale}/dashboard`);
  return account;
}

/** Exige un permiso concreto; si falta, redirige al panel. */
export async function requirePermission(locale: Locale, permission: Permission): Promise<Account> {
  const account = await requireAccount(locale);
  if (!account.permissions.includes(permission)) redirect(`/${locale}/dashboard`);
  return account;
}

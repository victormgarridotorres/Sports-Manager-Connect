"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/auth/form-state";
import { localeSchema, passwordSchema } from "@/lib/auth/schemas";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { visibilities } from "./options";

/*
 * Ajustes de cuenta: preferencias, email, contraseña y borrado de la cuenta.
 * Lo sensible (cambiar contraseña, borrar la cuenta) exige la contraseña actual.
 */

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return {
    supabase,
    userId: (claims?.sub as string | undefined) ?? null,
    email: typeof claims?.email === "string" ? claims.email : null,
  };
}

const expired: FormState = { status: "error", error: "sessionExpired" };

/** Comprueba la contraseña actual iniciando sesión de nuevo (también "refresca" la sesión). */
async function verifyPassword(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

const prefsSchema = z.object({
  locale: localeSchema,
  preferredLocale: localeSchema,
  visibility: z.enum(visibilities),
  marketing: z.preprocess((v) => v === "on", z.boolean()),
});

export async function savePreferences(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = prefsSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const { supabase, userId } = await session();
  if (!userId) return expired;

  const { locale, preferredLocale, visibility, marketing } = parsed.data;
  const [a, b, c] = await Promise.all([
    supabase.from("profiles").update({ preferred_locale: preferredLocale, visibility }).eq("id", userId),
    supabase.from("account_private").update({ marketing_opt_in: marketing }).eq("profile_id", userId),
    // Los emails de Supabase (confirmación, contraseña…) eligen el idioma con este dato.
    supabase.auth.updateUser({ data: { preferred_locale: preferredLocale } }),
  ]);
  if (a.error || b.error || c.error) {
    console.error("[account:prefs]", a.error?.message, b.error?.message, c.error?.message);
    return { status: "error", error: "generic" };
  }
  // El idioma elegido se aplica en el momento a toda la web.
  if (preferredLocale !== locale) redirect(`/${preferredLocale}/dashboard/account?saved=1`);
  refresh();
  return { status: "success" };
}

const emailSchema = z.object({
  locale: localeSchema,
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export async function changeEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", error: "invalidForm", fields: { email: "email" } };
  const { supabase, userId, email } = await session();
  if (!userId) return expired;
  if (parsed.data.email === email) return { status: "error", error: "sameEmail" };

  // Supabase envía un enlace de confirmación a la dirección antigua y a la nueva.
  const next = encodeURIComponent(`/${parsed.data.locale}/dashboard/account`);
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${next}` },
  );
  if (error) {
    if (error.code === "email_exists") return { status: "error", error: "emailExists" };
    if (error.code?.startsWith("over_")) return { status: "error", error: "rateLimited" };
    console.error("[account:email]", error.code, error.message);
    return { status: "error", error: "generic" };
  }
  return { status: "success" };
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1).max(72), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "mismatch" });

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "password");
    return field === "confirm"
      ? { status: "error", error: "passwordMismatch", fields: { confirm: "invalid" } }
      : { status: "error", error: "invalidForm", fields: { [field]: field === "password" ? "password" : "required" } };
  }
  const { userId, email } = await session();
  if (!userId || !email) return expired;
  if (!(await verifyPassword(email, parsed.data.current))) {
    return { status: "error", error: "wrongPassword", fields: { current: "invalid" } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", error: "samePassword" };
    if (error.code === "weak_password") return { status: "error", error: "weakPassword" };
    console.error("[account:password]", error.code, error.message);
    return { status: "error", error: "generic" };
  }
  return { status: "success" };
}

const deleteSchema = z.object({ locale: localeSchema, current: z.string().min(1).max(72) });

/** Derecho de supresión (RGPD): borra fotos, cuenta y todos los datos asociados. */
export async function deleteAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", error: "invalidForm", fields: { current: "required" } };
  const { userId, email } = await session();
  if (!userId || !email) return expired;
  if (!(await verifyPassword(email, parsed.data.current))) {
    return { status: "error", error: "wrongPassword", fields: { current: "invalid" } };
  }

  const supabase = await createClient();
  // Los ficheros de Storage no se pueden borrar por SQL: primero las fotos.
  const { data: files } = await supabase.storage.from("avatars").list(userId);
  if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("[account:delete]", error.code, error.message);
    return { status: "error", error: "generic" };
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect(`/${parsed.data.locale}?accountDeleted=1`);
}

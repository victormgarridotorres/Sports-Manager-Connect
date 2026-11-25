"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import type { z } from "zod";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import type { ErrorKey, FieldErrorKey, FormState } from "./form-state";
import { toSignupMetadata } from "./metadata";
import { safeNextPath } from "./safe-redirect";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "./schemas";

const FIELD_ERROR: Record<string, FieldErrorKey> = {
  email: "email",
  password: "password",
  displayName: "displayName",
};

function invalid(error: z.ZodError): FormState {
  const fields: Record<string, FieldErrorKey> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fields[field]) fields[field] = FIELD_ERROR[field] ?? "required";
  }
  // Si sólo faltan casillas obligatorias, un mensaje concreto; si no, el genérico.
  const keys = Object.keys(fields);
  const onlyCheckboxes = keys.length > 0 && keys.every((k) => k === "legal" || k === "adult");
  const key: ErrorKey = !onlyCheckboxes ? "invalidForm" : fields.legal ? "consentRequired" : "adultRequired";
  return { status: "error", error: key, fields };
}

function authError(error: AuthError, context: string): FormState {
  const map: Record<string, ErrorKey> = {
    invalid_credentials: "invalidCredentials",
    email_not_confirmed: "emailNotConfirmed",
    weak_password: "weakPassword",
    over_request_rate_limit: "rateLimited",
    over_email_send_rate_limit: "rateLimited",
    same_password: "samePassword",
  };
  const key = (error.code && map[error.code]) || "generic";
  if (key === "generic") console.error(`[auth:${context}]`, error.code, error.message);
  return { status: "error", error: key };
}

const formObject = (formData: FormData) => Object.fromEntries(formData.entries());

/** Enlace de los correos: /auth/confirm?next=<ruta interna en el idioma del usuario>. */
const confirmUrl = (next: string) => `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl(`/${parsed.data.locale}/dashboard`),
      data: toSignupMetadata(parsed.data),
    },
  });

  // Por seguridad no revelamos si el correo ya estaba registrado.
  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    return authError(error, "signup");
  }
  return { status: "success" };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { locale, email, password, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authError(error, "login");

  redirect(safeNextPath(next, `/${locale}/dashboard`));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(`/${parsed.data.locale}/reset-password`),
  });
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return authError(error, "forgot");
  }
  if (error) console.error("[auth:forgot]", error.code, error.message);
  // Respuesta idéntica exista o no la cuenta.
  return { status: "success" };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", error: "linkInvalid" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return authError(error, "reset");

  redirect(`/${parsed.data.locale}/dashboard`);
}

export async function signOut(formData: FormData): Promise<void> {
  const raw = formData.get("locale");
  const locale = typeof raw === "string" && hasLocale(raw) ? raw : defaultLocale;
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

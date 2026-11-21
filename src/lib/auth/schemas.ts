import { z } from "zod";
import { locales } from "@/i18n/config";
import { countryCodes } from "@/lib/countries";
import { roles } from "./permissions";

// Debe coincidir con supabase/config.toml (minimum_password_length + password_requirements)
// y con la configuración de Auth del proyecto en producción.
export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

export const localeSchema = z.enum(locales);

/**
 * Registro con datos básicos (como en el prototipo): el resto del perfil
 * (posición, especialidad…) se completa después desde el panel.
 */
export const signupSchema = z.object({
  /** Idioma de la interfaz desde la que se registra (para redirigir). */
  locale: localeSchema,
  /** Idioma preferido elegido en el formulario (emails, contenido). */
  preferredLocale: localeSchema,
  role: z.enum(roles),
  displayName: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  country: optional(z.enum(countryCodes)),
  /** Una sola casilla: términos y condiciones + política de privacidad. */
  legal: z.literal("on", { error: "consent" }),
  /** Sólo mayores de edad (18+). */
  adult: z.literal("on", { error: "adult" }),
});

export const loginSchema = z.object({
  locale: localeSchema,
  email: emailSchema,
  password: z.string().min(1).max(72),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  locale: localeSchema,
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  locale: localeSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

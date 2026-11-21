import type { SignupInput } from "./schemas";

/**
 * Metadata que se envía a supabase.auth.signUp. El trigger SQL
 * public.handle_new_user la lee para crear el perfil. Las claves deben
 * coincidir con las que usa el trigger.
 */
export function toSignupMetadata(input: SignupInput) {
  return {
    role: input.role,
    display_name: input.displayName,
    country: input.country ?? null,
    preferred_locale: input.preferredLocale,
    // La casilla única cubre términos y privacidad; el trigger guarda la fecha del servidor.
    terms_accepted: true,
    privacy_accepted: true,
    adult_confirmed: true,
  };
}

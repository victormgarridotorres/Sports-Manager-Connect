import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { localeOfPath, safeNextPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de los correos (confirmación de alta y recuperación
 * de contraseña). Ver supabase/templates/*.html.
 */
const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const fallback = `/${defaultLocale}/dashboard`;
  let next = safeNextPath(params.get("next"), fallback);
  const locale = localeOfPath(next, defaultLocale);
  if (type === "recovery") next = `/${locale}/reset-password`;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth:confirm]", error.code, error.message);
  }

  const failTarget = type === "recovery" ? "forgot-password" : "login";
  return NextResponse.redirect(new URL(`/${locale}/${failTarget}?error=linkInvalid`, request.url));
}

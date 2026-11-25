import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { localeOfPath, safeNextPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de los correos (confirmación de alta y recuperación
 * de contraseña). Admite los dos formatos de enlace de Supabase:
 *  - ?code=…            plantillas por defecto (flujo PKCE; mismo navegador)
 *  - ?token_hash=&type= plantillas propias de supabase/templates/*.html
 * El destino llega en ?next= (validado contra open redirects).
 */
const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const fallback = `/${defaultLocale}/dashboard`;
  let next = safeNextPath(params.get("next"), fallback);
  const locale = localeOfPath(next, defaultLocale);
  if (type === "recovery") next = `/${locale}/reset-password`;
  const isRecovery = type === "recovery" || next.startsWith(`/${locale}/reset-password`);

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth:confirm:code]", error.code, error.message);
    // Enlace abierto en otro navegador: falta la cookie del flujo PKCE. Supabase ya
    // verificó el email antes de redirigir aquí, así que el alta está confirmada y
    // basta con iniciar sesión. Para recuperar contraseña sí hace falta el mismo navegador.
    if (error.code === "pkce_code_verifier_not_found") {
      const target = isRecovery
        ? `/${locale}/forgot-password?error=linkOtherBrowser`
        : `/${locale}/login?notice=emailConfirmed`;
      return NextResponse.redirect(new URL(target, request.url));
    }
  } else if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth:confirm]", error.code, error.message);
  }

  const failTarget = isRecovery ? "forgot-password" : "login";
  return NextResponse.redirect(new URL(`/${locale}/${failTarget}?error=linkInvalid`, request.url));
}

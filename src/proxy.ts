import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  hasLocale,
  localeFromPathname,
  negotiateLocale,
} from "@/i18n/config";
import { isLegalSlug } from "@/content/legal";
import { roles } from "@/lib/auth/permissions";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

// Rutas (sin el prefijo de idioma) que exigen sesión.
const PROTECTED = ["/dashboard", "/reset-password"];
// Rutas sólo para usuarios sin sesión.
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // /auth/* (callbacks de Supabase) no lleva idioma; sólo refrescamos la sesión.
  if (pathname.startsWith("/auth/")) {
    return (await updateSession(request)).response;
  }

  // 1) Sin idioma en la URL -> redirigimos al preferido (cookie o Accept-Language).
  const locale = localeFromPathname(pathname);
  if (!locale) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const target = hasLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${target}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Tipo de perfil inexistente en /signup/<rol> o /roles/<rol> -> volver a elegir perfil.
  const signupRole = pathname.match(new RegExp(`^/${locale}/(?:signup|roles)/([^/]+)`))?.[1];
  if (signupRole && !(roles as readonly string[]).includes(signupRole)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/signup`;
    return NextResponse.redirect(url);
  }

  // Documento legal inexistente -> aviso legal.
  const legalDoc = pathname.match(new RegExp(`^/${locale}/legal/([^/]+)`))?.[1];
  if (legalDoc && !isLegalSlug(legalDoc)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/legal/legal-notice`;
    return NextResponse.redirect(url);
  }

  // 2) Refrescar sesión y proteger rutas. Es una primera barrera de UX:
  //    las páginas vuelven a comprobar la sesión (DAL) y la BD aplica RLS.
  const { response, isAuthenticated } = await updateSession(request);
  const rest = pathname.slice(locale.length + 1) || "/";

  if (!isAuthenticated && matches(rest, PROTECTED)) {
    const url = request.nextUrl.clone();
    if (rest.startsWith("/reset-password")) {
      url.pathname = `/${locale}/forgot-password`;
      url.search = "?error=linkInvalid";
    } else {
      url.pathname = `/${locale}/login`;
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
    }
    return redirectWithCookies(url, response);
  }

  if (isAuthenticated && matches(rest, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: [
    // Todo excepto estáticos, imágenes y ficheros con extensión.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};

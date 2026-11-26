/** Bandera emoji a partir del código ISO del país ("ES" -> 🇪🇸). */
export function countryFlag(code: string | null | undefined) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function countryName(code: string | null | undefined, locale: string) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function languageNames(codes: string[], locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "language" });
  return codes.map((c) => {
    const n = names.of(c) ?? c;
    return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
  });
}

/** Edad aproximada a partir del año de nacimiento (las categorías van por año). */
export function ageFromBirthYear(year: number | null | undefined, now: Date) {
  return year ? now.getFullYear() - year : null;
}

/** URL pública de la foto de perfil en Supabase Storage. */
export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/avatars/${path}` : null;
}

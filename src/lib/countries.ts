/**
 * Países ofrecidos en el registro (ISO 3166-1 alfa-2). Los nombres se
 * traducen en tiempo de ejecución con Intl.DisplayNames, así no hay que
 * mantenerlos en los 5 diccionarios.
 */
export const countryCodes = [
  // UE / EEE / Suiza
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE",
  "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
  // Resto de Europa
  "AL", "AD", "BA", "FO", "GB", "XK", "MD", "ME", "MK", "RS", "TR", "UA",
  // Otras potencias del balonmano
  "AR", "BH", "BR", "CL", "DZ", "EG", "JP", "KR", "MA", "QA", "SA", "TN", "US", "UY",
] as const;

export type CountryCode = (typeof countryCodes)[number];

export function isCountryCode(value: string): value is CountryCode {
  return (countryCodes as readonly string[]).includes(value);
}

export function countryOptions(locale: string): { code: CountryCode; name: string }[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return countryCodes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Listas de valores del perfil (deben coincidir con los enums de la BD). */
export { playerPositions, professionalTypes } from "@/lib/auth/permissions";
export type { PlayerPosition, ProfessionalType } from "@/lib/auth/permissions";

export const defensePositions = [
  "advanced", "second_left", "second_right", "exterior_left", "exterior_right", "central",
] as const;
export type DefensePosition = (typeof defensePositions)[number];

export const hands = ["right", "left"] as const;
export type Hand = (typeof hands)[number];

export const availabilities = ["available_now", "next_season", "not_looking"] as const;
export type Availability = (typeof availabilities)[number];

export const visibilities = ["public", "verified_only"] as const;
export type Visibility = (typeof visibilities)[number];

/** Idiomas ofrecidos (ISO 639-1). Los nombres salen de Intl.DisplayNames. */
export const languageCodes = [
  "es", "en", "fr", "de", "pt", "it", "ca", "eu", "gl", "nl", "da", "no", "sv", "is", "fi",
  "pl", "cs", "sk", "hu", "ro", "hr", "sr", "sl", "mk", "el", "tr", "ru", "uk", "ar", "ja", "ko",
] as const;

export function languageOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "language" });
  return languageCodes
    .map((code) => {
      const name = names.of(code) ?? code;
      return { code, name: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Coordenadas de las posiciones sobre la pista (viewBox 340x210), del prototipo. */
export const attackLayout: { pos: (typeof import("@/lib/auth/permissions").playerPositions)[number]; x: number; y: number; ly: number }[] = [
  { pos: "goalkeeper", x: 170, y: 32, ly: 56 },
  { pos: "left_wing", x: 40, y: 44, ly: 70 },
  { pos: "right_wing", x: 300, y: 44, ly: 68 },
  { pos: "pivot", x: 170, y: 82, ly: 106 },
  { pos: "left_back", x: 85, y: 118, ly: 142 },
  { pos: "right_back", x: 255, y: 118, ly: 142 },
  { pos: "centre_back", x: 170, y: 148, ly: 172 },
];

export const defenseLayout: { pos: DefensePosition; x: number; y: number; ly: number }[] = [
  { pos: "advanced", x: 170, y: 62, ly: 38 },
  { pos: "second_left", x: 85, y: 92, ly: 67 },
  { pos: "second_right", x: 255, y: 92, ly: 68 },
  { pos: "central", x: 170, y: 128, ly: 104 },
  { pos: "exterior_left", x: 40, y: 166, ly: 140 },
  { pos: "exterior_right", x: 300, y: 166, ly: 142 },
];

import "server-only";
import type { Locale } from "./config";
import type { Messages } from "./dictionaries/es";

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  es: () => import("./dictionaries/es").then((m) => m.default),
  en: () => import("./dictionaries/en").then((m) => m.default),
  fr: () => import("./dictionaries/fr").then((m) => m.default),
  de: () => import("./dictionaries/de").then((m) => m.default),
  pt: () => import("./dictionaries/pt").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();

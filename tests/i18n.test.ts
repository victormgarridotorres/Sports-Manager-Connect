import { describe, expect, it } from "vitest";
import { localeFromPathname, locales, negotiateLocale } from "@/i18n/config";
import { format } from "@/i18n/format";
import es from "@/i18n/dictionaries/es";
import en from "@/i18n/dictionaries/en";
import fr from "@/i18n/dictionaries/fr";
import de from "@/i18n/dictionaries/de";
import pt from "@/i18n/dictionaries/pt";

const all = { es, en, fr, de, pt };

function flatten(obj: object, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

describe("diccionarios", () => {
  it("hay uno por cada idioma soportado", () => {
    expect(Object.keys(all).sort()).toEqual([...locales].sort());
  });

  const reference = flatten(es);
  for (const [locale, dict] of Object.entries(all)) {
    it(`${locale}: mismas claves, sin textos vacíos y con las mismas variables`, () => {
      const flat = flatten(dict);
      expect(Object.keys(flat).sort()).toEqual(Object.keys(reference).sort());
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), key).not.toBe("");
        const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(vars(value), key).toEqual(vars(reference[key]));
      }
    });
  }
});

describe("negociación de idioma", () => {
  it.each([
    [null, "es"],
    ["fr-CH, fr;q=0.9, en;q=0.8", "fr"],
    ["it-IT, de;q=0.5", "de"],
    ["ja, zh;q=0.8", "es"],
    ["en;q=0, pt-BR;q=0.4", "pt"],
  ])("%s -> %s", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it("detecta el idioma en la ruta", () => {
    expect(localeFromPathname("/de/login")).toBe("de");
    expect(localeFromPathname("/login")).toBeNull();
    expect(localeFromPathname("/")).toBeNull();
  });

  it("interpola variables", () => {
    expect(format("Hola, {name}", { name: "Ana" })).toBe("Hola, Ana");
    expect(format("{missing}", {})).toBe("{missing}");
  });
});

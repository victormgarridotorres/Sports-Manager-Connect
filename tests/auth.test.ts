import { describe, expect, it } from "vitest";
import { toSignupMetadata } from "@/lib/auth/metadata";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { signupSchema } from "@/lib/auth/schemas";

const valid = {
  locale: "es",
  role: "player",
  displayName: "  Pablo Pérez ",
  email: "Pablo@Example.com",
  password: "Balonmano2026",
  country: "ES",
  preferredLocale: "en",
  legal: "on",
  adult: "on",
};

describe("signupSchema", () => {
  it("acepta un registro válido y normaliza datos", () => {
    const r = signupSchema.parse(valid);
    expect(r.email).toBe("pablo@example.com");
    expect(r.displayName).toBe("Pablo Pérez");
    expect(r.preferredLocale).toBe("en");
  });

  it.each(["corta1A", "sinmayusculas123", "SINMINUSCULAS123", "SinNumerosAqui"])(
    "rechaza la contraseña débil %s",
    (password) => {
      expect(signupSchema.safeParse({ ...valid, password }).success).toBe(false);
    },
  );

  it("exige aceptar términos y privacidad", () => {
    const r = signupSchema.safeParse({ ...valid, legal: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["legal"]);
  });

  it("exige confirmar la mayoría de edad", () => {
    const r = signupSchema.safeParse({ ...valid, adult: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["adult"]);
  });

  it("el país es opcional", () => {
    expect(signupSchema.safeParse({ ...valid, country: "" }).success).toBe(true);
  });

  it("rechaza idiomas no soportados", () => {
    expect(signupSchema.safeParse({ ...valid, preferredLocale: "ar" }).success).toBe(false);
  });

  it("rechaza roles inexistentes (p. ej. admin)", () => {
    expect(signupSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("rechaza países fuera de la lista", () => {
    expect(signupSchema.safeParse({ ...valid, country: "XX" }).success).toBe(false);
  });
});

describe("toSignupMetadata", () => {
  it("genera las claves que espera el trigger SQL", () => {
    const meta = toSignupMetadata(signupSchema.parse({ ...valid, role: "club", displayName: "BM Ciudad" }));
    expect(meta).toEqual({
      role: "club",
      display_name: "BM Ciudad",
      country: "ES",
      preferred_locale: "en",
      terms_accepted: true,
      privacy_accepted: true,
      adult_confirmed: true,
    });
  });
});

describe("safeNextPath (anti open-redirect)", () => {
  const fb = "/es/dashboard";
  it.each([
    ["/en/dashboard", "/en/dashboard"],
    ["/fr/dashboard?tab=1", "/fr/dashboard?tab=1"],
    ["https://evil.com", fb],
    ["//evil.com/es", fb],
    ["/\\evil.com", fb],
    ["/xx/dashboard", fb],
    ["dashboard", fb],
    [null, fb],
    ["/es/../../evil", fb],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input, fb)).toBe(expected);
  });
});

describe("precios futuros", () => {
  it("aficionado gratis siempre; resto con precio tras el primer año", async () => {
    const { futureYearlyPriceEur, formatEur } = await import("@/lib/plans");
    expect(futureYearlyPriceEur.fan).toBeNull();
    expect(futureYearlyPriceEur.club).toBe(84);
    expect(formatEur(12, "es").replace(/\s/g, " ")).toBe("12 €");
    expect(formatEur(12, "en")).toBe("€12");
  });
});

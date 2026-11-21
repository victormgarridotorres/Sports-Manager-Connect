import { describe, expect, it } from "vitest";
import { isLegalSlug, legalDocs, legalSlugs } from "@/content/legal";
import es from "@/i18n/dictionaries/es";

describe("textos legales", () => {
  it("existen los tres documentos con contenido", () => {
    expect(legalSlugs.sort()).toEqual(["cookies", "legal-notice", "privacy"]);
    for (const slug of legalSlugs) {
      expect(legalDocs[slug].blocks.length, slug).toBeGreaterThan(20);
      expect(legalDocs[slug].source).toMatch(/^https:\/\/sportsmanagerconnect\.es\//);
    }
  });

  it("todos los idiomas tienen título para cada documento", () => {
    for (const slug of legalSlugs) expect(es.legal.docs[slug]).toBeTruthy();
  });

  it("la casilla del registro enlaza a dos documentos (dos fragmentos *…*)", () => {
    expect(es.auth.signup.legal.match(/\*[^*]+\*/g)).toHaveLength(2);
    expect(isLegalSlug("legal-notice") && isLegalSlug("privacy")).toBe(true);
    expect(isLegalSlug("terms")).toBe(false);
  });
});

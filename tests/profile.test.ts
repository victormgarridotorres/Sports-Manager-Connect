import { describe, expect, it } from "vitest";
import { profileCompletion, tabsForRole } from "@/lib/profile/completion";
import { ageFromBirthYear, countryFlag } from "@/lib/profile/display";
import { careerSchema, clubSchema, highlightSchema, playerSchema } from "@/lib/profile/schemas";
import type { FullProfile } from "@/lib/profile/types";
import { embedUrl, parseVideoUrl } from "@/lib/profile/video";

describe("enlaces de vídeo (highlights)", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://vimeo.com/123456789", "vimeo", "123456789"],
    ["https://player.vimeo.com/video/123456789", "vimeo", "123456789"],
  ])("%s", (url, provider, videoId) => {
    expect(parseVideoUrl(url)).toEqual({ provider, videoId });
  });

  it.each([
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=<script>",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "no es una url",
  ])("rechaza %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });

  it("incrusta YouTube sin cookies y Vimeo con 'do not track'", () => {
    expect(embedUrl({ provider: "youtube", videoId: "dQw4w9WgXcQ" })).toContain("youtube-nocookie.com");
    expect(embedUrl({ provider: "vimeo", videoId: "123456789" })).toContain("dnt=1");
  });
});

describe("validación del perfil", () => {
  it("la posición secundaria no puede repetir la principal", () => {
    const r = playerSchema.parse({ position: "pivot", secondary_position: "pivot", defense_position: "", secondary_defense_position: "central" });
    expect(r.secondary_position).toBeNull();
    expect(r.secondary_defense_position).toBeNull(); // sin principal no hay secundaria
  });

  it("solo mayores de edad: rechaza años de nacimiento demasiado recientes", () => {
    const thisYear = new Date().getFullYear();
    expect(playerSchema.safeParse({ birth_year: String(thisYear - 10) }).success).toBe(false);
    expect(playerSchema.safeParse({ birth_year: String(thisYear - 20) }).success).toBe(true);
  });

  it("valores vacíos se guardan como null", () => {
    expect(playerSchema.parse({ height_cm: "", current_club: "  " })).toMatchObject({ height_cm: null, current_club: null });
  });

  it("web del club: añade https:// y rechaza esquemas peligrosos", () => {
    expect(clubSchema.parse({ website: "bmciudad.es" }).website).toBe("https://bmciudad.es");
    expect(clubSchema.safeParse({ website: "javascript:alert(1)" }).success).toBe(false);
  });

  it("trayectoria: el fin no puede ser anterior al inicio", () => {
    expect(careerSchema.safeParse({ start_year: "2020", end_year: "2018", organization: "Club" }).success).toBe(false);
    expect(careerSchema.safeParse({ start_year: "2020", end_year: "", organization: "Club" }).success).toBe(true);
  });

  it("highlight: solo enlaces de YouTube/Vimeo", () => {
    expect(highlightSchema.safeParse({ url: "https://vimeo.com/123456789" }).success).toBe(true);
    expect(highlightSchema.safeParse({ url: "https://example.com/video.mp4" }).success).toBe(false);
  });
});

function profile(role: FullProfile["profile"]["role"], extra: Partial<FullProfile> = {}): FullProfile {
  return {
    profile: {
      id: "x", role, display_name: "Test", country: null, city: null, bio: null, languages: [], avatar_path: null,
      visibility: "public", verification_status: "not_required", preferred_locale: "es", created_at: "2026-01-01",
    },
    player: null, professional: null, club: null, career: [], highlights: [], roster: [],
    ...extra,
  };
}

describe("completar el perfil", () => {
  it("un perfil vacío está al 0 % y uno con todo al 100 %", () => {
    expect(profileCompletion(profile("fan")).percent).toBe(0);
    const full = profile("fan");
    full.profile = { ...full.profile, avatar_path: "x/a.webp", bio: "Hola", country: "ES", languages: ["es"] };
    expect(profileCompletion(full).percent).toBe(100);
  });

  it("cada rol tiene sus pasos y pestañas", () => {
    expect(profileCompletion(profile("player")).items.map((i) => i.key)).toContain("highlight");
    expect(profileCompletion(profile("club")).items.map((i) => i.key)).toContain("roster");
    expect(tabsForRole("fan")).toEqual(["basics"]);
    expect(tabsForRole("club")).toEqual(["basics", "club", "roster"]);
  });
});

describe("utilidades de presentación", () => {
  it("bandera y edad", () => {
    expect(countryFlag("ES")).toBe("🇪🇸");
    expect(countryFlag("xx")).toBe("");
    expect(ageFromBirthYear(2000, new Date("2026-06-01"))).toBe(26);
  });
});

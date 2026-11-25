import type { FullProfile } from "./types";

/** Pestañas del editor de perfil. */
export const profileTabs = ["basics", "sport", "career", "highlights", "club", "roster"] as const;
export type ProfileTab = (typeof profileTabs)[number];

export function tabsForRole(role: FullProfile["profile"]["role"]): ProfileTab[] {
  switch (role) {
    case "player":
      return ["basics", "sport", "career", "highlights"];
    case "professional":
      return ["basics", "sport", "career", "highlights"];
    case "club":
      return ["basics", "club", "roster"];
    default:
      return ["basics"];
  }
}

export type CompletionItem = { key: string; done: boolean; tab: ProfileTab };

/** Pasos para "Completa tu perfil" y su porcentaje, calculados con datos reales. */
export function profileCompletion(p: FullProfile): { percent: number; items: CompletionItem[] } {
  const { profile, player, professional, club } = p;
  const items: CompletionItem[] = [
    { key: "avatar", done: !!profile.avatar_path, tab: "basics" },
    { key: "bio", done: !!profile.bio?.trim(), tab: "basics" },
    { key: "country", done: !!profile.country, tab: "basics" },
    { key: "languages", done: profile.languages.length > 0, tab: "basics" },
  ];

  if (profile.role === "player") {
    items.push(
      { key: "positions", done: !!player?.position && !!player?.defense_position, tab: "sport" },
      { key: "physical", done: !!player?.height_cm && !!player?.weight_kg && !!player?.dominant_hand, tab: "sport" },
      { key: "availability", done: !!player?.availability, tab: "sport" },
      { key: "currentClub", done: !!player?.current_club, tab: "sport" },
      { key: "career", done: p.career.length > 0, tab: "career" },
      { key: "highlight", done: p.highlights.length > 0, tab: "highlights" },
    );
  } else if (profile.role === "professional") {
    items.push(
      { key: "specialty", done: !!professional?.professional_type && professional.years_experience != null, tab: "sport" },
      { key: "availability", done: !!professional?.availability, tab: "sport" },
      { key: "education", done: !!professional?.education?.trim() || !!professional?.achievements?.trim(), tab: "sport" },
      { key: "career", done: p.career.length > 0, tab: "career" },
    );
  } else if (profile.role === "club") {
    items.push(
      { key: "clubInfo", done: !!club?.city && !!club?.league && !!club?.founded_year, tab: "club" },
      { key: "roster", done: p.roster.length > 0, tab: "roster" },
    );
  }

  const done = items.filter((i) => i.done).length;
  return { percent: Math.round((done / items.length) * 100), items };
}

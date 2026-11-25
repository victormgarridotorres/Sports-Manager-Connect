import type { Role, VerificationStatus } from "@/lib/auth/permissions";
import type { Availability, DefensePosition, Hand, PlayerPosition, ProfessionalType, Visibility } from "./options";

export type BaseProfile = {
  id: string;
  role: Role;
  display_name: string;
  country: string | null;
  city: string | null;
  bio: string | null;
  languages: string[];
  avatar_path: string | null;
  visibility: Visibility;
  verification_status: VerificationStatus;
  preferred_locale: string;
  created_at: string;
};

export type PlayerData = {
  position: PlayerPosition | null;
  secondary_position: PlayerPosition | null;
  defense_position: DefensePosition | null;
  secondary_defense_position: DefensePosition | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  dominant_hand: Hand | null;
  availability: Availability | null;
  current_club: string | null;
  current_league: string | null;
};

export type ProfessionalData = {
  professional_type: ProfessionalType | null;
  years_experience: number | null;
  availability: Availability | null;
  current_entity: string | null;
  education: string | null;
  achievements: string | null;
};

export type ClubData = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  founded_year: number | null;
  league: string | null;
  venue: string | null;
  website: string | null;
  honours: string | null;
};

export type CareerEntry = { id: string; start_year: number; end_year: number | null; organization: string; detail: string | null };
export type Highlight = { id: string; provider: "youtube" | "vimeo"; video_id: string; title: string | null };
export type RosterEntry = { id: string; player_name: string; position: PlayerPosition | null; shirt_number: number | null };

export type FullProfile = {
  profile: BaseProfile;
  player: PlayerData | null;
  professional: ProfessionalData | null;
  club: ClubData | null;
  career: CareerEntry[];
  highlights: Highlight[];
  roster: RosterEntry[];
};

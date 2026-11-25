import { z } from "zod";
import { countryCodes } from "@/lib/countries";
import { availabilities, defensePositions, hands, languageCodes, playerPositions, professionalTypes } from "./options";
import { parseVideoUrl } from "./video";

const year = () => new Date().getFullYear();
const blankToNull = (v: unknown) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v);
const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? blankToNull(v.trim()) : blankToNull(v)), z.string().max(max).nullable());
const optInt = (min: number, max: () => number) =>
  z.preprocess((v) => (blankToNull(v) === null ? null : Number(v)), z.number().int().min(min).nullable())
    .refine((v) => v === null || v <= max(), { message: "range" });
const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable());

export const basicsSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  country: optEnum(countryCodes),
  city: optText(80),
  bio: optText(1500),
  languages: z.array(z.enum(languageCodes)).max(10),
});

export const playerSchema = z
  .object({
    position: optEnum(playerPositions),
    secondary_position: optEnum(playerPositions),
    defense_position: optEnum(defensePositions),
    secondary_defense_position: optEnum(defensePositions),
    // Sólo mayores de edad: año de nacimiento de hace al menos 17 años (cumple 18 este año).
    birth_year: optInt(1940, () => year() - 17),
    height_cm: optInt(120, () => 230),
    weight_kg: optInt(40, () => 160),
    dominant_hand: optEnum(hands),
    availability: optEnum(availabilities),
    current_club: optText(120),
    current_league: optText(120),
  })
  .transform((d) => ({
    ...d,
    // La secundaria no puede repetir la principal ni existir sin ella.
    secondary_position: d.position && d.secondary_position !== d.position ? d.secondary_position : null,
    secondary_defense_position:
      d.defense_position && d.secondary_defense_position !== d.defense_position ? d.secondary_defense_position : null,
  }));

export const professionalSchema = z.object({
  professional_type: optEnum(professionalTypes),
  years_experience: optInt(0, () => 60),
  availability: optEnum(availabilities),
  current_entity: optText(120),
  education: optText(2000),
  achievements: optText(2000),
});

export const clubSchema = z.object({
  city: optText(80),
  founded_year: optInt(1850, year),
  league: optText(120),
  venue: optText(120),
  website: z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s) return null;
      return /^https?:\/\//i.test(s) ? s : `https://${s}`;
    },
    z.string().max(200).regex(/^https?:\/\/[^\s]{3,200}$/).pipe(z.url()).nullable(),
  ),
  honours: optText(2000),
});

export const careerSchema = z
  .object({
    start_year: z.coerce.number().int().min(1950),
    end_year: optInt(1950, () => year() + 1),
    organization: z.string().trim().min(2).max(120),
    detail: optText(160),
  })
  .refine((d) => d.start_year <= year() + 1, { path: ["start_year"], message: "range" })
  .refine((d) => d.end_year === null || d.end_year >= d.start_year, { path: ["end_year"], message: "range" });

export const highlightSchema = z.object({
  url: z.string().trim().max(300).transform((v, ctx) => {
    const ref = parseVideoUrl(v);
    if (!ref) {
      ctx.addIssue({ code: "custom", message: "video" });
      return z.NEVER;
    }
    return ref;
  }),
  title: optText(100),
});

export const rosterSchema = z.object({
  player_name: z.string().trim().min(2).max(80),
  position: optEnum(playerPositions),
  shirt_number: optInt(0, () => 99),
});

export const idSchema = z.object({ id: z.uuid() });

import { z } from "zod";
import { countryCodes } from "@/lib/countries";
import { playerPositions } from "@/lib/profile/options";
import { applicationStatuses, listingTypes } from "./options";

const blankToNull = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null);
const optText = (max: number) => z.preprocess(blankToNull, z.string().max(max).nullable());

export const listingSchema = z.object({
  type: z.enum(listingTypes),
  org_name: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(120),
  highlight: optText(60),
  subtitle: optText(160),
  league: optText(120),
  country: z.preprocess(blankToNull, z.enum(countryCodes).nullable()), // vacío = internacional
  position: z.preprocess(blankToNull, z.enum(playerPositions).nullable()),
  salary: optText(120),
  description: z.string().trim().min(20).max(4000),
  requirements: optText(2000),
  benefits: optText(2000),
  about: optText(2000),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const applySchema = z.object({ listingId: z.guid(), message: optText(1000) });
export const applicationStatusSchema = z.object({ id: z.guid(), status: z.enum(applicationStatuses) });
export const listingIdSchema = z.object({ id: z.guid() });

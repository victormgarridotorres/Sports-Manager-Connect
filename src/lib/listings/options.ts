import type { Permission, Role } from "@/lib/auth/permissions";

export const listingTypes = ["club_seeks", "player_available", "professional_available", "agent_represents"] as const;
export type ListingType = (typeof listingTypes)[number];
export const applicationStatuses = ["sent", "shortlisted", "rejected"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
export const listingSorts = ["recent", "interest"] as const;
export const LISTING_DAYS = 90;

/** Color de la etiqueta de cada tipo (como las del prototipo). */
export const listingAccent: Record<ListingType, string> = {
  club_seeks: "acc-navy",
  player_available: "acc-gold",
  professional_available: "acc-diag",
  agent_represents: "acc-slate",
};

/**
 * Tipos que puede publicar alguien. Es un espejo de public.can_publish_listing
 * (la BD es quien decide de verdad); aquí solo sirve para la interfaz.
 */
export function publishableTypes(role: Role, permissions: Permission[], professionalType?: string | null): ListingType[] {
  const out: ListingType[] = [];
  if (role === "club" && permissions.includes("offers.publish")) out.push("club_seeks");
  if (role === "player" && permissions.includes("availability.publish")) out.push("player_available");
  if (role === "professional" && permissions.includes("availability.publish")) out.push("professional_available");
  if (role === "professional" && permissions.includes("offers.publish") && professionalType === "agent") out.push("agent_represents");
  return out;
}

/** Texto en líneas ("una línea por punto") -> lista sin vacíos. */
export const lines = (text: string | null | undefined) =>
  (text ?? "").split(/\r?\n/).map((l) => l.replace(/^[\s•\-–*✓]+/, "").trim()).filter(Boolean);

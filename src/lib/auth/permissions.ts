/**
 * Matriz de roles y permisos.
 *
 * Fuente de verdad en BD: tabla public.role_permissions (migración inicial).
 * Este fichero la replica para la UI; el test permissions.test.ts comprueba
 * que ambas coinciden. La autorización real de datos la hace Postgres (RLS +
 * public.has_permission), esto sólo decide qué se muestra y protege rutas.
 */

export const roles = ["fan", "player", "professional", "club"] as const;
export type Role = (typeof roles)[number];

export const verificationStatuses = ["not_required", "pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const playerPositions = [
  "goalkeeper", "left_wing", "left_back", "centre_back", "pivot", "right_back", "right_wing",
] as const;
export type PlayerPosition = (typeof playerPositions)[number];

export const professionalTypes = [
  "coach", "fitness_coach", "physio", "nutritionist", "psychologist", "referee", "agent", "scout", "analyst", "other",
] as const;
export type ProfessionalType = (typeof professionalTypes)[number];

export const permissions = [
  "content.view",
  "content.comment",
  "profiles.follow",
  "profile.edit_own",
  "messages.send",
  "player_cv.publish",
  "professional_cv.publish",
  "offers.apply",
  "offers.publish",
  "talent.search",
  "club.manage",
  "club.roster.manage",
] as const;
export type Permission = (typeof permissions)[number];

type Grant = { permission: Permission; requiresVerification: boolean };

const base: Grant[] = [
  { permission: "content.view", requiresVerification: false },
  { permission: "content.comment", requiresVerification: false },
  { permission: "profiles.follow", requiresVerification: false },
  { permission: "profile.edit_own", requiresVerification: false },
];

export const rolePermissions: Record<Role, Grant[]> = {
  fan: [...base],
  player: [
    ...base,
    { permission: "player_cv.publish", requiresVerification: false },
    { permission: "offers.apply", requiresVerification: false },
    { permission: "messages.send", requiresVerification: false },
  ],
  professional: [
    ...base,
    { permission: "professional_cv.publish", requiresVerification: false },
    { permission: "offers.apply", requiresVerification: false },
    { permission: "messages.send", requiresVerification: false },
    { permission: "talent.search", requiresVerification: true },
  ],
  club: [
    ...base,
    { permission: "messages.send", requiresVerification: false },
    { permission: "club.manage", requiresVerification: false },
    { permission: "club.roster.manage", requiresVerification: true },
    { permission: "offers.publish", requiresVerification: true },
    { permission: "talent.search", requiresVerification: true },
  ],
};

/** Roles cuya cuenta debe verificar un administrador. */
export function requiresVerification(role: Role): boolean {
  return role === "professional" || role === "club";
}

export function effectivePermissions(role: Role, status: VerificationStatus): Permission[] {
  return rolePermissions[role]
    .filter((g) => !g.requiresVerification || status === "verified")
    .map((g) => g.permission);
}

/** Permisos que el rol tendrá cuando su cuenta esté verificada. */
export function lockedPermissions(role: Role, status: VerificationStatus): Permission[] {
  if (status === "verified") return [];
  return rolePermissions[role].filter((g) => g.requiresVerification).map((g) => g.permission);
}

export function can(
  account: { role: Role; verificationStatus: VerificationStatus } | null | undefined,
  permission: Permission,
): boolean {
  if (!account) return false;
  return effectivePermissions(account.role, account.verificationStatus).includes(permission);
}

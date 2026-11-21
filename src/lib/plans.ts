import type { Role } from "./auth/permissions";

/**
 * Precios previstos tras el primer año (lanzamiento gratuito para todos).
 * Sólo se MUESTRAN como precio futuro: todavía no hay cobros ni pasarela de pago.
 * Cifras tomadas de prototipo_home.html. null = gratis para siempre.
 */
export const futureYearlyPriceEur: Record<Role, number | null> = {
  fan: null,
  player: 12,
  professional: 24,
  club: 84,
};

export function formatEur(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

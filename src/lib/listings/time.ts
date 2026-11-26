/** "hace 2 h", "hace 3 días"… en el idioma de la página. */
export function timeAgo(iso: string, locale: string, now: Date) {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(diff / 86_400), "day");
  return rtf.format(Math.round(diff / (86_400 * 30)), "month");
}

export const isNew = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime() < 48 * 3600 * 1000;

export function daysLeft(iso: string, now: Date) {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

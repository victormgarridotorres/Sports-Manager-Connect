"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

function format(iso: string, locale: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(diff / 86_400), "day");
  return rtf.format(Math.round(diff / (86_400 * 30)), "month");
}

/**
 * «hace 2 h» calculado en el navegador: así una página en caché no se queda
 * con una hora congelada. En el servidor se pinta vacío.
 */
export function RelativeTime({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  const text = useSyncExternalStore(noop, () => format(iso, locale), () => "");
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

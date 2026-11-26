"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

function format(iso: string, locale: string, mode: "list" | "bubble" | "day", labels: { yesterday: string; today: string }) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (mode === "bubble") return time;
  if (mode === "day") return sameDay(d, now) ? labels.today : sameDay(d, yesterday) ? labels.yesterday : d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const date = d.toLocaleDateString(locale, { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return sameDay(d, now) ? time : sameDay(d, yesterday) ? labels.yesterday : date;
}

/**
 * Hora en la zona horaria de quien lo ve (el servidor no la conoce). En el
 * servidor se pinta vacía y el navegador la rellena, sin diferencias de hidratación.
 */
export function LocalTime({ iso, locale, mode, labels }: { iso: string; locale: string; mode: "list" | "bubble" | "day"; labels: { yesterday: string; today: string } }) {
  const text = useSyncExternalStore(
    noop,
    () => format(iso, locale, mode, labels),
    () => "",
  );
  return <time dateTime={iso}>{text}</time>;
}

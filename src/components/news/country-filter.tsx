"use client";

import { useRouter } from "next/navigation";

/** Selector de país: navega al cambiar (sin botón). */
export function CountryFilter({ value, options, label, hrefFor }: { value: string; options: { value: string; label: string }[]; label: string; hrefFor: Record<string, string> }) {
  const router = useRouter();
  return (
    <select aria-label={label} value={value} onChange={(e) => router.push(hrefFor[e.target.value] ?? hrefFor[""])}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

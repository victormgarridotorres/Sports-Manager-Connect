"use client";

import { useRouter } from "next/navigation";
import { localeFlags, localeNames, locales, type Locale } from "@/i18n/config";
import { useDismissable } from "./use-dismiss";

/**
 * Ruta actual con otro idioma (conserva la query). Se calcula al pulsar, no al
 * pintar: así el menú no depende de la URL y se puede prerenderizar en cualquier página.
 */
function localizedPath(target: Locale) {
  const { pathname, search } = window.location;
  const rest = pathname.split("/").slice(2).join("/");
  return `/${target}${rest ? `/${rest}` : ""}${search}`;
}

export function LanguageMenu({ locale, label }: { locale: Locale; label: string }) {
  const { open, setOpen, ref } = useDismissable<HTMLDivElement>();
  const router = useRouter();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[13.5px] font-semibold text-[#d6d8e0] hover:border-white/30"
      >
        <span aria-hidden>🌐</span> {locale.toUpperCase()} <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div role="menu" className="menu-panel w-[220px]">
          {locales.map((l) => (
            <button
              key={l}
              role="menuitemradio"
              aria-checked={l === locale}
              lang={l}
              className={`menu-item ${l === locale ? "active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (l !== locale) router.push(localizedPath(l));
              }}
            >
              <span aria-hidden className="text-base">{localeFlags[l]}</span>
              <span className="flex-1">{localeNames[l]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Píldoras de idioma del pie de página. */
export function LanguagePills({ locale }: { locale: Locale }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2.5">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={localeNames[l]}
          aria-current={l === locale ? "true" : undefined}
          onClick={() => l !== locale && router.push(localizedPath(l))}
          className={`rounded-full border px-[11px] py-[5px] ${
            l === locale ? "border-white bg-white font-bold text-night" : "border-white/15 hover:border-white/40"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";

/** Aviso para quien aún no ha elegido su alias del foro. */
export function AliasNotice({ locale, t, next }: { locale: Locale; t: Messages["community"]; next: string }) {
  return (
    <div className="card-box mb-6 flex flex-wrap items-center gap-4">
      <span aria-hidden className="text-3xl">🎭</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t.aliasNotice.title}</p>
        <p className="text-[13.5px] text-muted">{t.aliasNotice.text}</p>
      </div>
      <Link href={`/${locale}/dashboard/forum?next=${encodeURIComponent(next)}`} className="btn btn-gold btn-sm">
        {t.aliasNotice.cta}
      </Link>
    </div>
  );
}

export const fmtNumber = (n: number, locale: string) => n.toLocaleString(locale);

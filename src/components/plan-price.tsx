import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import type { Role } from "@/lib/auth/permissions";
import { formatEur, futureYearlyPriceEur } from "@/lib/plans";

/** "Gratis" + condición: gratis para siempre, o gratis el primer año y precio futuro. */
export function PlanPrice({ role, locale, t }: { role: Role; locale: string; t: Messages["auth"]["signup"] }) {
  const future = futureYearlyPriceEur[role];
  return (
    <div className="mb-[18px]">
      <p className="price-amt !mb-1">{t.free}</p>
      {future === null ? (
        <p className="text-[12.5px] text-on-dark-muted">{t.freeForever}</p>
      ) : (
        <>
          <p className="text-[12.5px] font-bold text-gold">{t.freeFirstYear}</p>
          <p className="text-[12.5px] text-on-dark-muted">{format(t.futurePrice, { price: formatEur(future, locale) })}</p>
        </>
      )}
    </div>
  );
}

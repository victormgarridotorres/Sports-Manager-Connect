import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { roles } from "@/lib/auth/permissions";
import { PlanPrice } from "./plan-price";

/** Tarjetas de los 4 perfiles con su precio (gratis el primer año). */
export function PlanCards({ locale, dict }: { locale: Locale; dict: Messages }) {
  const s = dict.auth.signup;
  return (
    <>
      <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => {
          const r = dict.roles[role];
          return (
            <article key={role} className="price-card">
              <h3>{r.name}</h3>
              <p className="tag">{r.tagline}</p>
              <PlanPrice role={role} locale={locale} t={s} />
              <ul className="price-feats">
                {r.features.map((f) => (
                  <li key={f}>
                    <b aria-hidden>✓</b> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/signup/${role}`}
                className={`btn ${role === "player" ? "btn-gold" : "btn-ghost"}`}
                aria-label={`${s.choose}: ${r.name}`}
              >
                {s.choose}
              </Link>
            </article>
          );
        })}
      </div>
      <p className="mt-8 text-center text-[13.5px] text-on-dark-muted">{s.pricingNote}</p>
    </>
  );
}

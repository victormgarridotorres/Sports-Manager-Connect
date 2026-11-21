import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { PlanPrice } from "@/components/plan-price";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { roles } from "@/lib/auth/permissions";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).auth.signup.crumb } : {};
}

/** Paso 1: elegir el tipo de perfil (equivale a "Planes" en el prototipo). */
export default async function ChooseRolePage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const s = dict.auth.signup;

  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: s.crumb }]}
        eyebrow={s.chooseEyebrow}
        title={s.chooseTitle}
        lead={s.chooseLead}
      />
      <PageBody>
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
      </PageBody>
    </>
  );
}

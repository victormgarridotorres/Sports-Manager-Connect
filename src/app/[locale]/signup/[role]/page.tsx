import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { PageBody, SubHero } from "@/components/page-shell";
import { PlanPrice } from "@/components/plan-price";
import { RoleIcon } from "@/components/role-icon";
import { hasLocale, locales } from "@/i18n/config";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { roles, type Role } from "@/lib/auth/permissions";
import { countryOptions } from "@/lib/countries";

const isRole = (value: string): value is Role => (roles as readonly string[]).includes(value);

export function generateStaticParams() {
  return locales.flatMap((locale) => roles.map((role) => ({ locale, role })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/signup/[role]">): Promise<Metadata> {
  const { locale, role } = await params;
  if (!hasLocale(locale) || !isRole(role)) return {};
  const dict = await getDictionary(locale);
  return { title: `${dict.auth.signup.crumb} · ${dict.roles[role].name}` };
}

/** Paso 2: datos de la cuenta + resumen del perfil elegido (prototipo: "Registro"). */
export default async function SignupRolePage({ params }: PageProps<"/[locale]/signup/[role]">) {
  const { locale, role } = await params;
  if (!hasLocale(locale) || !isRole(role)) notFound();
  const dict = await getDictionary(locale);
  const s = dict.auth.signup;
  const r = dict.roles[role];

  return (
    <>
      <SubHero
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: s.crumb, href: `/${locale}/signup` },
          { label: r.name },
        ]}
        eyebrow={format(s.roleEyebrow, { role: r.name })}
        title={format(s.roleTitle, { role: r.name })}
        lead={r.signupLead}
      />
      <PageBody>
        <div className="registro-layout">
          <SignupForm
            locale={locale}
            role={role}
            t={{
              signup: s,
              errors: dict.auth.errors,
              fieldErrors: dict.auth.fieldErrors,
              email: dict.auth.email,
              password: dict.auth.password,
              passwordHint: dict.auth.passwordHint,
            }}
            countries={countryOptions(locale)}
          />
          <aside className="registro-summary">
            <div className="cat-icon cat-icon-sm">
              <RoleIcon role={role} />
            </div>
            <h3>{r.name}</h3>
            <p className="mb-3 text-[13px] text-on-dark-muted">{r.tagline}</p>
            <PlanPrice role={role} locale={locale} t={s} />
            <ul className="price-feats !mb-5">
              {r.features.map((f) => (
                <li key={f}>
                  <b aria-hidden>✓</b> {f}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/signup`} className="text-[12.5px] font-bold text-gold hover:underline">
              {s.changeRole}
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

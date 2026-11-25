import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { Rich } from "@/components/rich-text";
import { RoleIcon } from "@/components/role-icon";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { rolePages } from "@/i18n/role-pages";
import { roles, type Role } from "@/lib/auth/permissions";

const isRole = (v: string): v is Role => (roles as readonly string[]).includes(v);

export function generateStaticParams() {
  return locales.flatMap((locale) => roles.map((role) => ({ locale, role })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/roles/[role]">): Promise<Metadata> {
  const { locale, role } = await params;
  if (!hasLocale(locale) || !isRole(role)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.roles[role].name, description: rolePages[locale].roles[role].lead };
}

/** Página informativa de cada tipo de perfil (prototipo: "rol-aficionado", "rol-jugador"…). */
export default async function RolePage({ params }: PageProps<"/[locale]/roles/[role]">) {
  const { locale, role } = await params;
  if (!hasLocale(locale) || !isRole(role)) notFound();
  const dict = await getDictionary(locale);
  const c = rolePages[locale];
  const r = c.roles[role];

  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.roles[role].name }]}
        eyebrow={c.eyebrow}
        title={r.title}
        lead={r.lead}
      >
        <div className="mt-6">
          <Link href={`/${locale}/signup/${role}`} className="btn btn-gold">
            {r.cta}
          </Link>
        </div>
      </SubHero>
      <PageBody>
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <span className="eyebrow-dark">{c.whatYouCanDo}</span>
          <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold text-white">{r.heading}</h2>
        </div>
        <div className="grid gap-[18px] sm:grid-cols-2">
          {r.features.map((f) => (
            <article key={f.title} className="cat-card !p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="cat-icon cat-icon-sm !mb-0">
                  <RoleIcon role={role} />
                </div>
                {!f.available ? <span className="eyebrow-dark !mb-0 !text-[11px]">{c.soon}</span> : null}
              </div>
              <h3>{f.title}</h3>
              <p className="!mb-0">{f.text}</p>
            </article>
          ))}
        </div>
        <div className="registro-summary mt-12 flex flex-wrap items-center justify-between gap-5 !static">
          <div>
            <h3 className="!text-xl">
              <Rich text={r.ctaTitle} />
            </h3>
            <p className="text-[14px] text-on-dark">{c.ctaNote}</p>
          </div>
          <Link href={`/${locale}/signup/${role}`} className="btn btn-gold">
            {r.ctaButton}
          </Link>
        </div>
      </PageBody>
    </>
  );
}

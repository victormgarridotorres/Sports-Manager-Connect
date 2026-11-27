import Link from "next/link";
import { notFound } from "next/navigation";
import { QueryNotice } from "@/components/query-notice";
import { RoleIcon } from "@/components/role-icon";
import { Rich } from "@/components/rich-text";
import { GlobalStrip, HeroCard, HeroStats, JoinCta, Journey, LatestListings, Moves, PartnersStrip } from "@/components/home/sections";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { roles } from "@/lib/auth/permissions";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const h = dict.home;

  return (
    <>
      <section className="relative overflow-hidden bg-[radial-gradient(120%_140%_at_15%_-10%,#283a5c_0%,var(--ink)_55%,var(--night)_100%)] py-20 text-white sm:pt-24 sm:pb-[84px]">
        {/* Foto del prototipo, fundida con el fondo (sólo en pantallas anchas) */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 hidden aspect-[700/937] w-[54%] max-w-[740px] bg-[linear-gradient(180deg,transparent_52%,rgba(15,23,40,.75)_80%,#0f1728_100%),url(/brand/hero.jpg)] bg-cover bg-right [mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,.55)_20%,#000_42%)] lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(15,23,40,.95)_0%,rgba(15,23,40,.86)_32%,rgba(15,23,40,.55)_50%,rgba(15,23,40,.22)_68%,transparent_96%),radial-gradient(600px_300px_at_85%_6%,rgba(226,162,51,.14),transparent_70%),repeating-linear-gradient(120deg,rgba(255,255,255,.02)_0_2px,transparent_2px_60px)]"
        />
        <div className="wrap relative">
          <div className="max-w-xl">
            <QueryNotice param="accountDeleted" text={h.accountDeleted} />
          </div>
          <h1 className="mt-[18px] mb-[22px] max-w-[920px] text-[clamp(36px,5.4vw,64px)] leading-[1.06] font-extrabold tracking-[-.02em]">
            <Rich text={h.title} />
          </h1>
          <p className="mb-[18px] font-display text-sm font-bold tracking-[.08em] text-on-dark uppercase">
            <Rich text={dict.brand.motto} />
          </p>
          <p className="mb-[34px] max-w-[680px] text-lg leading-relaxed text-on-dark sm:text-[18.5px]">{h.lead}</p>
          <div className="flex flex-wrap gap-3.5">
            <Link href={`/${locale}/signup`} className="btn btn-gold">
              {h.cta}
            </Link>
            <Link href={`/${locale}/move`} className="btn btn-ghost">
              {h.exploreMove} →
            </Link>
          </div>
          <form action={`/${locale}/move`} method="get" role="search" className="search-card mt-[34px]">
            <label htmlFor="home-search" className="sr-only">
              {h.search.label}
            </label>
            <input id="home-search" name="q" type="search" placeholder={h.search.placeholder} maxLength={80} autoComplete="off" />
            <button type="submit" className="btn btn-gold !px-[18px] !py-[11px]">
              {h.search.button}
            </button>
          </form>
          <HeroStats locale={locale} dict={dict} />
          <HeroCard locale={locale} dict={dict} />
        </div>
      </section>

      <Journey dict={dict} />

      <section className="bg-white py-[88px]" id="perfiles">
        <div className="wrap">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <span className="eyebrow">{h.rolesEyebrow}</span>
            <h2 className="mt-4 mb-3.5 text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-.01em]">{h.rolesTitle}</h2>
            <p className="text-base leading-relaxed text-muted">{h.rolesLead}</p>
          </div>
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Link key={role} href={`/${locale}/roles/${role}`} className="cat-card">
                <div className="cat-icon">
                  <RoleIcon role={role} />
                </div>
                <h3>{dict.roles[role].name}</h3>
                <p>{dict.roles[role].description}</p>
                <div className="cat-foot">
                  {h.roleCta}
                  <span aria-hidden className="arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Moves locale={locale} dict={dict} />
      <LatestListings locale={locale} dict={dict} />
      <GlobalStrip locale={locale} dict={dict} />
      <JoinCta locale={locale} dict={dict} />
      <PartnersStrip locale={locale} dict={dict} />
    </>
  );
}

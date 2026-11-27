import Link from "next/link";
import { legalSlugs } from "@/content/legal";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { Brand } from "./brand";
import { LanguagePills } from "./language-menu";
import { Rich } from "./rich-text";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Messages }) {
  return (
    <footer className="bg-night pt-16 pb-7 text-on-dark-muted">
      <div className="wrap">
        <div className="mb-12 flex flex-wrap justify-between gap-10">
        <div className="max-w-[300px]">
          <Brand locale={locale} title={dict.meta.title} />
          <p className="mt-4 mb-2 font-display text-[11.5px] font-extrabold tracking-[.08em] text-on-dark uppercase">
            <Rich text={dict.brand.motto} />
          </p>
          <p className="text-[13.5px] leading-relaxed text-[#7d7f8c]">{dict.brand.description}</p>
        </div>
        <nav aria-label={dict.home.footerExplore}>
          <h4 className="mb-4 text-[13px] font-bold tracking-[.04em] text-white uppercase">{dict.home.footerExplore}</h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            {[
              { href: "/move", label: "Move" },
              { href: "/listings", label: dict.listings.crumb },
              { href: "/news", label: dict.news.crumb },
              { href: "/community", label: dict.community.crumb },
              { href: "/plans", label: dict.nav.plans },
              { href: "/partners", label: dict.partnersPage.crumb },
            ].map((l) => (
              <li key={l.href}>
                <Link href={`/${locale}${l.href}`} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={dict.legal.title}>
          <h4 className="mb-4 text-[13px] font-bold tracking-[.04em] text-white uppercase">{dict.legal.title}</h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            {legalSlugs.map((slug) => (
              <li key={slug}>
                <Link href={`/${locale}/legal/${slug}`} className="hover:text-white">
                  {dict.legal.docs[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[12.5px]">
          <span>© {dict.meta.title}</span>
          <LanguagePills locale={locale} />
        </div>
      </div>
    </footer>
  );
}

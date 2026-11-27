import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { partners } from "@/content/partners";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = (await getDictionary(locale)).partnersPage;
  return { title: t.crumb, description: t.lead };
}

export default async function PartnersPage({ params }: PageProps<"/[locale]/partners">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.partnersPage;
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb }]} eyebrow={dict.home.partners.eyebrow} title={t.title} lead={t.lead} />
      <PageBody>
        <div className="mx-auto max-w-[1040px]">
          <div className="partner-grid">
            {partners.map((p) => {
              const inner = (
                <>
                  <div className="logo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- logos con proporciones distintas */}
                    <img src={p.logo} alt={p.name} loading="lazy" />
                  </div>
                  <b>{p.name}</b>
                  <span>{t.kinds[p.kind]}</span>
                </>
              );
              return p.url ? (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="partner-card">
                  {inner}
                </a>
              ) : (
                <div key={p.name} className="partner-card">
                  {inner}
                </div>
              );
            })}
          </div>
          <div className="card-box mt-10 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-[620px]">
              <h3 className="!mb-1">{t.joinTitle}</h3>
              <p className="text-[14px] text-muted">{t.joinText}</p>
            </div>
            <a href="mailto:info@sportsmanagerconnect.es" className="btn btn-gold">
              {t.joinCta}
            </a>
          </div>
        </div>
      </PageBody>
    </>
  );
}

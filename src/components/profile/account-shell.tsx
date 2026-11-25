import type { ReactNode } from "react";
import { PageBody, SubHero } from "@/components/page-shell";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { SettingsNav } from "./settings-nav";

/** Marco común de las páginas de "Mi cuenta" (cabecera + sub-navegación). */
export function AccountShell({
  locale,
  dict,
  current,
  title,
  lead,
  children,
}: {
  locale: Locale;
  dict: Messages;
  current: "profile" | "account";
  title: string;
  lead: string;
  children: ReactNode;
}) {
  const p = dict.profile;
  return (
    <>
      <SubHero
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: p.nav.dashboard, href: `/${locale}/dashboard` },
          { label: current === "profile" ? p.nav.profile : p.nav.account },
        ]}
        eyebrow={p.eyebrow}
        title={title}
        lead={lead}
      />
      <PageBody>
        <div className="mx-auto max-w-[860px]">
          <SettingsNav locale={locale} current={current} t={p.nav} />
          {children}
        </div>
      </PageBody>
    </>
  );
}

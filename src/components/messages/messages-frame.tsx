import type { ReactNode } from "react";
import { PageBody, SubHero } from "@/components/page-shell";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";

export function MessagesFrame({ locale, dict, children }: { locale: Locale; dict: Messages; children: ReactNode }) {
  const t = dict.messages;
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb }]}
        eyebrow={dict.profile.eyebrow}
        title={t.title}
        lead={t.lead}
      />
      <PageBody>{children}</PageBody>
    </>
  );
}

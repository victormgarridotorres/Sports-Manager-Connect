import Link from "next/link";
import type { ReactNode } from "react";
import { PageBody, SubHero } from "@/components/page-shell";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { requireAdmin } from "@/lib/auth/dal";
import { adminStats } from "@/lib/admin/queries";

export type AdminTab = "overview" | "verifications" | "users" | "reports" | "log";

/** Cabecera del panel (estática). */
export function AdminHero({ locale, dict, current }: { locale: Locale; dict: Messages; current?: string }) {
  const t = dict.admin;
  return (
    <SubHero
      crumbs={[{ label: dict.nav.home, href: `/${locale}` }, ...(current ? [{ label: t.crumb, href: `/${locale}/admin` }, { label: current }] : [{ label: t.crumb }])]}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
    />
  );
}

/** Comprueba que es admin y pinta las pestañas (con avisos de lo pendiente). */
export async function AdminFrame({ locale, dict, tab, next, children }: { locale: Locale; dict: Messages; tab: AdminTab; next: string; children: ReactNode }) {
  await requireAdmin(locale, next);
  const t = dict.admin;
  const s = await adminStats();
  const tabs: { key: AdminTab; href: string; label: string; badge?: number }[] = [
    { key: "overview", href: "/admin", label: t.tabs.overview },
    { key: "verifications", href: "/admin/verifications", label: t.tabs.verifications, badge: s?.pending_verifications },
    { key: "users", href: "/admin/users", label: t.tabs.users },
    { key: "reports", href: "/admin/reports", label: t.tabs.reports, badge: s?.open_reports },
    { key: "log", href: "/admin/log", label: t.tabs.log },
  ];
  return (
    <>
      <nav className="tabs" aria-label={t.crumb}>
        {tabs.map((x) => (
          <Link key={x.key} href={`/${locale}${x.href}`} className={`tab ${x.key === tab ? "active" : ""}`} aria-current={x.key === tab ? "page" : undefined}>
            {x.label}
            {x.badge ? <span className="admin-badge">{x.badge}</span> : null}
          </Link>
        ))}
        <Link href={`/${locale}/news/editor`} className="tab">
          ✏️ {dict.news.editor.crumb}
        </Link>
      </nav>
      {children}
    </>
  );
}

export function AdminBody({ children }: { children: ReactNode }) {
  return <PageBody>{children}</PageBody>;
}

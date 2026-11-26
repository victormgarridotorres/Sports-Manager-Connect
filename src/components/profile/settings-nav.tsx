import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";

type Current = "dashboard" | "profile" | "forum" | "account";

/** Sub-navegación de la cuenta (prototipo: Mi panel · Mi perfil · Perfil del foro · Ajustes de cuenta). */
export function SettingsNav({ locale, current, t }: { locale: Locale; current: Current; t: Messages["profile"]["nav"] }) {
  const items: { key: Current; href: string; icon: string; label: string }[] = [
    { key: "dashboard", href: `/${locale}/dashboard`, icon: "📊", label: t.dashboard },
    { key: "profile", href: `/${locale}/dashboard/profile`, icon: "✏️", label: t.profile },
    { key: "forum", href: `/${locale}/dashboard/forum`, icon: "🎭", label: t.forum },
    { key: "account", href: `/${locale}/dashboard/account`, icon: "⚙️", label: t.account },
  ];
  return (
    <nav className="settings-subnav" aria-label={t.label}>
      {items.map((i) =>
        i.key === current ? (
          <span key={i.key} className="settings-subnav-item is-current" aria-current="page">
            <span aria-hidden>{i.icon}</span> {i.label}
          </span>
        ) : (
          <Link key={i.key} href={i.href} className="settings-subnav-item">
            <span aria-hidden>{i.icon}</span> {i.label}
          </Link>
        ),
      )}
    </nav>
  );
}

"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { signOut } from "@/lib/auth/actions";
import { initials } from "@/lib/initials";
import { useDismissable } from "./use-dismiss";

type Props = {
  locale: Locale;
  name: string;
  subtitle: string;
  userId: string;
  labels: { menu: string; dashboard: string; logout: string; profile: string; viewPublic: string; account: string; favorites: string; listings: string };
};

export function AccountMenu({ locale, name, subtitle, userId, labels }: Props) {
  const { open, setOpen, ref } = useDismissable<HTMLDivElement>();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.menu}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pr-3.5 pl-1.5 hover:border-white/30 hover:bg-white/10"
      >
        <span aria-hidden className="avatar-tile size-[26px] rounded-full text-[10px]">{initials(name)}</span>
        <span aria-hidden className="text-sm text-white">☰</span>
      </button>
      {open ? (
        <div role="menu" className="menu-panel w-[260px]">
          <div className="flex items-center gap-3 px-2.5 pt-2.5 pb-3.5">
            <span aria-hidden className="avatar-tile size-[42px] rounded-xl text-sm">{initials(name)}</span>
            <div className="min-w-0">
              <b className="block truncate text-sm text-ink">{name}</b>
              <span className="text-xs text-muted">{subtitle}</span>
            </div>
          </div>
          {[
            { href: `/${locale}/dashboard`, icon: "📊", label: labels.dashboard },
            { href: `/${locale}/dashboard/profile`, icon: "✏️", label: labels.profile },
            { href: `/${locale}/p/${userId}`, icon: "👤", label: labels.viewPublic },
            { href: `/${locale}/move`, icon: "🔁", label: "Move" },
            { href: `/${locale}/favorites`, icon: "★", label: labels.favorites },
            { href: `/${locale}/listings/mine`, icon: "📋", label: labels.listings },
            { href: `/${locale}/dashboard/account`, icon: "⚙️", label: labels.account },
          ].map((item) => (
            <Link key={item.href} role="menuitem" href={item.href} className="menu-item" onClick={() => setOpen(false)}>
              <span aria-hidden className="w-[18px] text-center">{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="mx-1 my-1.5 h-px bg-line" />
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button role="menuitem" type="submit" className="menu-item text-danger">
              <span aria-hidden className="w-[18px] text-center">↩</span> {labels.logout}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { PageBody, SubHero } from "@/components/page-shell";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { requireAccount } from "@/lib/auth/dal";
import { isNewsEditor } from "@/lib/news/editor";

/** Cabecera de la redacción. */
export function EditorHero({ locale, dict, current }: { locale: Locale; dict: Messages; current?: string }) {
  const t = dict.news.editor;
  return (
    <SubHero
      crumbs={[
        { label: dict.nav.home, href: `/${locale}` },
        { label: dict.news.crumb, href: `/${locale}/news` },
        ...(current ? [{ label: t.crumb, href: `/${locale}/news/editor` }, { label: current }] : [{ label: t.crumb }]),
      ]}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
    />
  );
}

/** Solo para la redacción: si no, explica cómo se entra. */
export async function EditorGate({ locale, dict, next, children }: { locale: Locale; dict: Messages; next: string; children: ReactNode }) {
  await requireAccount(locale, next);
  if (!(await isNewsEditor())) {
    return (
      <div className="card-box flex flex-col items-start gap-3 text-[14px]">
        <p className="font-bold">{dict.news.editor.noAccessTitle}</p>
        <p className="text-muted">{dict.news.editor.noAccess}</p>
        <Link href={`/${locale}/news`} className="btn btn-gold btn-sm">
          {dict.news.backToNews}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function EditorBody({ children }: { children: ReactNode }) {
  return <PageBody>{children}</PageBody>;
}

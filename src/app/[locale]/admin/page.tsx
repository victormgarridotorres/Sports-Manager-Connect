import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LogList } from "@/components/admin/log-list";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { adminLog, adminStats } from "@/lib/admin/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.crumb, robots: { index: false } };
}

export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} />
      <AdminBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <AdminFrame locale={locale} dict={dict} tab="overview" next={`/${locale}/admin`}>
            <Overview locale={locale} dict={dict} />
          </AdminFrame>
        </Suspense>
      </AdminBody>
    </>
  );
}

async function Overview({ locale, dict }: { locale: Locale; dict: Messages }) {
  const t = dict.admin;
  const [s, log] = await Promise.all([adminStats(), adminLog(undefined, 12)]);
  if (!s) return <div className="card-box text-muted">{dict.auth.errors.generic}</div>;
  const n = (v: number) => v.toLocaleString(locale);
  const todo = [
    { v: s.pending_verifications, l: t.stats.pendingVerifications, href: "/admin/verifications" },
    { v: s.open_reports, l: t.stats.openReports, href: "/admin/reports" },
    { v: s.news_drafts, l: t.stats.newsDrafts, href: "/news/editor" },
    { v: s.suspended, l: t.stats.suspended, href: "/admin/users?filter=suspended" },
  ];
  const figures = [
    { v: s.users, l: t.stats.users },
    { v: s.players, l: dict.roles.player.name },
    { v: s.professionals, l: dict.roles.professional.name },
    { v: s.clubs, l: dict.roles.club.name },
    { v: s.fans, l: dict.roles.fan.name },
    { v: s.listings_active, l: t.stats.listings },
  ];
  const week = [
    { v: s.signups_7d, l: t.stats.signups7d },
    { v: s.messages_7d, l: t.stats.messages7d },
    { v: s.forum_posts_7d, l: t.stats.forum7d },
    { v: s.hidden_content, l: t.stats.hidden },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="todo">
        <h2 id="todo" className="mb-3 text-[13px] font-bold tracking-wider text-on-dark-muted uppercase">
          {t.todo}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {todo.map((x) => (
            <Link key={x.l} href={`/${locale}${x.href}`} className={`card-box admin-stat ${x.v > 0 ? "is-hot" : ""}`}>
              <b>{n(x.v)}</b>
              <span>{x.l}</span>
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="figures">
        <h2 id="figures" className="mb-3 text-[13px] font-bold tracking-wider text-on-dark-muted uppercase">
          {t.figures}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {figures.map((x) => (
            <div key={x.l} className="card-box admin-stat">
              <b>{n(x.v)}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {week.map((x) => (
            <div key={x.l} className="card-box admin-stat">
              <b>{n(x.v)}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card-box" aria-labelledby="recent">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="recent" className="!m-0">
            {t.recent}
          </h3>
          <Link href={`/${locale}/admin/log`} className="text-[13px] font-bold text-gold-deep">
            {t.seeAll} →
          </Link>
        </div>
        <LogList entries={log} locale={locale} dict={dict} />
      </section>
    </div>
  );
}

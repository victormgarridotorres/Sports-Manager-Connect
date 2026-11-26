import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Alert } from "@/components/auth/form-ui";
import { PageBody, SubHero } from "@/components/page-shell";
import { RoleIcon } from "@/components/role-icon";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import Link from "next/link";
import { Avatar } from "@/components/profile/avatar";
import { SettingsNav } from "@/components/profile/settings-nav";
import { requireAccount } from "@/lib/auth/dal";
import { profileCompletion } from "@/lib/profile/completion";
import { loadProfile } from "@/lib/profile/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).nav.dashboard } : {};
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Suspense
      fallback={
        <>
          <SubHero lead={dict.dashboard.loading} />
          <PageBody>{null}</PageBody>
        </>
      }
    >
      <Dashboard locale={locale} dict={dict} />
    </Suspense>
  );
}

async function Dashboard({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/dashboard`);
  const full = await loadProfile(account.id);
  const d = dict.dashboard;
  const status = account.verificationStatus;
  const completion = full ? profileCompletion(full) : null;
  const tabHref = (tab: string) => (tab === "basics" ? `/${locale}/dashboard/profile` : `/${locale}/dashboard/profile/${tab}`);

  return (
    <>
      <SubHero>
        <div className="flex flex-wrap items-center gap-[18px]">
          <Avatar
            path={full?.profile.avatar_path ?? null}
            name={account.displayName}
            size={64}
            className="rounded-2xl border-[3px] border-white/15"
          />
          <div className="min-w-0">
            <h1 className="!mb-0.5">{format(d.welcome, { name: account.displayName })}</h1>
            <p>{d.summary}</p>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <span className="text-[13px] text-on-dark-muted">{d.yourProfile}</span>
            <b className="flex items-center gap-2 text-[15px] sm:justify-end">
              <span className="cat-icon !m-0 size-6 rounded-md !shadow-none [&_svg]:size-3.5">
                <RoleIcon role={account.role} />
              </span>
              {dict.roles[account.role].name}
              {status !== "not_required" ? (
                <span className="font-semibold text-on-dark"> · {dict.verification[status]}</span>
              ) : null}
            </b>
          </div>
        </div>
      </SubHero>
      <PageBody>
        <div className="flex flex-col gap-5">
          <SettingsNav locale={locale} current="dashboard" t={dict.profile.nav} />
          {status === "pending" ? <Alert tone="warning">{d.pendingNotice}</Alert> : null}
          {status === "rejected" ? <Alert tone="error">{d.rejectedNotice}</Alert> : null}

          {completion ? (
            <section className="card-box">
              <h3>{completion.percent === 100 ? d.completeDone : format(d.completeTitle, { percent: completion.percent })}</h3>
              <div className="mb-5 flex items-center gap-3.5">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-paper-soft"
                  role="progressbar"
                  aria-valuenow={completion.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={d.completeAria}
                >
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-deep))]" style={{ width: `${completion.percent}%` }} />
                </div>
                <span className="text-[13px] font-bold text-muted">{completion.percent}%</span>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {completion.items.map((item) => (
                  <li key={item.key}>
                    <Link href={tabHref(item.tab)} className={`flex items-center gap-2.5 text-[13.5px] hover:underline ${item.done ? "text-muted" : ""}`}>
                      <span aria-hidden className={`check-dot ${item.done ? "on" : "off"}`} />
                      {d.completeItems[item.key as keyof typeof d.completeItems]}
                      <span className="sr-only">{item.done ? ` (${d.doneLabel})` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <p className="mb-2.5 text-[11px] font-bold tracking-wider text-on-dark-muted uppercase">{d.quickTitle}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { href: `/${locale}/dashboard/profile`, icon: "✏️", label: d.quickEdit },
                { href: `/${locale}/p/${account.id}`, icon: "👤", label: d.quickPublic },
                { href: `/${locale}/messages`, icon: "✉️", label: dict.messages.crumb },
                { href: `/${locale}/move`, icon: "🔁", label: "Move" },
                { href: `/${locale}/favorites`, icon: "★", label: dict.favorites.crumb },
                { href: `/${locale}/listings`, icon: "📋", label: dict.listings.crumb },
                { href: `/${locale}/dashboard/account`, icon: "🔐", label: d.quickAccount },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="card-box flex flex-col items-center gap-1.5 !p-4 text-center text-[13.5px] font-bold transition hover:border-gold">
                  <span aria-hidden className="text-xl">{q.icon}</span>
                  {q.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="card-box">
            <h3>{d.permissionsTitle}</h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {account.permissions.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13.5px]">
                  <span aria-hidden className="check-dot on" />
                  {dict.permissions[p]}
                </li>
              ))}
            </ul>
            {account.lockedPermissions.length > 0 ? (
              <>
                <p className="form-section-title mt-6">{d.lockedTitle}</p>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {account.lockedPermissions.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                      <span aria-hidden className="check-dot off" />
                      {dict.permissions[p]}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </PageBody>
    </>
  );
}
